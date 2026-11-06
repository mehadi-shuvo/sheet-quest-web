'use client';

import { useEffect, useRef, useState } from 'react';
import { CalculationMode, UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import type { FWorkbook } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import '@univerjs/preset-sheets-core/lib/index.css';

type WorkbookSnapshot = ReturnType<FWorkbook['save']>;

type Verification = {
  formulas: Record<string, string>;
  initialValues: Record<string, unknown>;
  recalculatedValues: Record<string, unknown>;
  averageNumericValue: number;
  averageDisplayValue: string;
  workbookId: string;
  sheetId: string;
  snapshotRestored: boolean;
  initializationMs: number;
};

type Runtime = {
  disposed: boolean;
  operationVersion: number;
  workbook: FWorkbook;
  initialSnapshot: WorkbookSnapshot;
  exportedSnapshot: WorkbookSnapshot | null;
  univerAPI: ReturnType<typeof createUniver>['univerAPI'];
};

const FORMULA_READY_TIMEOUT_MS = 5_000;

function cloneSnapshot(snapshot: WorkbookSnapshot): WorkbookSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkbookSnapshot;
}

function readProof(workbook: FWorkbook) {
  const sheet = workbook.getActiveSheet();
  return {
    A1: sheet.getRange('A1').getValue(),
    B1: sheet.getRange('B1').getValue(),
    A3: sheet.getRange('A3').getValue(),
    B4: sheet.getRange('B4').getRawValue(),
    C2: sheet.getRange('C2').getValue(),
    F1: sheet.getRange('F1').getValue(),
    G2: sheet.getRange('G2').getValue(),
  };
}

function readFormulas(workbook: FWorkbook) {
  const sheet = workbook.getActiveSheet();
  return {
    A3: sheet.getRange('A3').getFormula(),
    B4: sheet.getRange('B4').getFormula(),
    C2: sheet.getRange('C2').getFormula(),
    F1: sheet.getRange('F1').getFormula(),
    G2: sheet.getRange('G2').getFormula(),
  };
}

function proofIsReady(values: ReturnType<typeof readProof>, expectedG2: number) {
  return (
    values.A3 === 30 &&
    typeof values.B4 === 'number' &&
    Math.abs(values.B4 - 13 / 3) < 0.0000001 &&
    values.C2 === 'Pass' &&
    values.F1 === 40 &&
    values.G2 === expectedG2
  );
}

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

async function waitForCalculation(
  runtime: Runtime,
  workbook: FWorkbook,
  operationVersion: number
) {
  // The formula trigger controller is registered during Univer's Rendered stage.
  // Waiting on that lifecycle condition prevents early facade mutations from being
  // dropped while React mounts the host container.
  while (!runtime.disposed && runtime.univerAPI.getCurrentLifecycleStage() < runtime.univerAPI.Enum.LifecycleStages.Rendered) {
    await nextFrame();
  }
  if (runtime.disposed || runtime.workbook !== workbook || runtime.operationVersion !== operationVersion) {
    return null;
  }

  const formula = runtime.univerAPI.getFormula();
  formula.executeCalculation();
  await formula.onCalculationResultApplied(FORMULA_READY_TIMEOUT_MS);

  if (!runtime.disposed && runtime.workbook === workbook && runtime.operationVersion === operationVersion) {
    return true;
  }

  return false;
}

async function waitForProof(
  runtime: Runtime,
  workbook: FWorkbook,
  expectedG2: number,
  operationVersion: number
) {
  if (!(await waitForCalculation(runtime, workbook, operationVersion))) return null;

  const values = readProof(workbook);
  if (proofIsReady(values, expectedG2)) return values;
  throw new Error(`Formula calculation completed with unexpected values: ${JSON.stringify(values)}`);
}

const INITIAL_WORKBOOK_DATA = {
  id: 'formula-proof',
  name: 'Formula proof',
  sheetOrder: ['formula-proof-sheet'],
  sheets: {
    'formula-proof-sheet': {
      id: 'formula-proof-sheet',
      name: 'Formula proof',
      rowCount: 100,
      columnCount: 20,
      cellData: {
        0: {
          0: { v: 10 },
          1: { v: 4 },
          2: { v: 80 },
          3: { v: 'A' },
          4: { v: 10 },
          5: { f: '=SUMIF(D1:D3,"A",E1:E3)' },
          6: { v: 10 },
        },
        1: {
          0: { v: 20 },
          1: { v: 5 },
          2: { f: '=IF(C1>=40,"Pass","Fail")' },
          3: { v: 'B' },
          4: { v: 20 },
          6: { f: '=G1*2' },
        },
        2: {
          0: { f: '=SUM(A1:A2)' },
          1: { v: 4 },
          3: { v: 'A' },
          4: { v: 30 },
        },
        3: {
          1: { f: '=AVERAGE(B1:B3)', s: { n: { pattern: '0.00' } } },
        },
      },
    },
  },
};

export function UniverSpreadsheetSpike() {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const container = document.createElement('div');
    container.style.height = '100%';
    host.append(container);

    const startedAt = performance.now();
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container,
          formula: { initialFormulaComputing: CalculationMode.FORCED },
        }),
      ],
    });
    const workbook = univerAPI.createWorkbook(INITIAL_WORKBOOK_DATA);
    const initialSnapshot = cloneSnapshot(workbook.save());

    const runtime: Runtime = {
      disposed: false,
      operationVersion: 0,
      workbook,
      initialSnapshot,
      exportedSnapshot: null,
      univerAPI,
    };
    runtimeRef.current = runtime;

    const replaceWorkbook = (snapshot: WorkbookSnapshot) => {
      const previousId = runtime.workbook.getId();

      // Native snapshots retain their unit ID, so replacement must dispose the
      // registered source unit before recreating it from the snapshot.
      if (!runtime.univerAPI.disposeUnit(previousId)) {
        throw new Error(`Unable to dispose workbook ${previousId} before snapshot restoration.`);
      }

      runtime.workbook = runtime.univerAPI.createWorkbook(cloneSnapshot(snapshot));
      return runtime.workbook;
    };

    const runInitialVerification = async () => {
      const operationVersion = ++runtime.operationVersion;
      try {
        const initialValues = await waitForProof(runtime, runtime.workbook, 20, operationVersion);
        if (!initialValues) return;

        const formulas = readFormulas(runtime.workbook);
        const sheet = runtime.workbook.getActiveSheet();
        const averageNumericValue = sheet.getRange('B4').getRawValue();
        const averageDisplayValue = sheet.getRange('B4').getDisplayValue();
        if (typeof averageNumericValue !== 'number') {
          throw new Error('AVERAGE must remain a numeric cell value.');
        }

        sheet.getRange('G1').setValue(15);
        const recalculatedValues = await waitForProof(runtime, runtime.workbook, 30, operationVersion);
        if (!recalculatedValues) return;

        const restoredWorkbook = replaceWorkbook(runtime.initialSnapshot);
        const restoreOperationVersion = ++runtime.operationVersion;
        const restoredValues = await waitForProof(runtime, restoredWorkbook, 20, restoreOperationVersion);
        if (!restoredValues) return;

        const restoredSheet = restoredWorkbook.getActiveSheet();
        const snapshotRestored =
          readFormulas(restoredWorkbook).B4 === formulas.B4 &&
          restoredSheet.getRange('B4').getNumberFormat() === '0.00' &&
          restoredSheet.getRange('B4').getDisplayValue() === averageDisplayValue &&
          proofIsReady(restoredValues, 20);

        if (!runtime.disposed && runtime.operationVersion === restoreOperationVersion) {
          setVerification({
            formulas,
            initialValues,
            recalculatedValues,
            averageNumericValue,
            averageDisplayValue,
            workbookId: restoredWorkbook.getId(),
            sheetId: restoredSheet.getSheetId(),
            snapshotRestored,
            initializationMs: Math.round(performance.now() - startedAt),
          });
        }
      } catch (caught) {
        if (!runtime.disposed) {
          setError(caught instanceof Error ? caught.message : 'Unknown Univer spike error');
        }
      }
    };

    void runInitialVerification();

    return () => {
      runtime.disposed = true;
      runtimeRef.current = null;
      univer.dispose();
      container.remove();
    };
  }, []);

  const restore = (snapshot: WorkbookSnapshot, source: 'reset' | 'exported') => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.disposed) return;

    try {
      setError(null);
      const previousId = runtime.workbook.getId();
      if (!runtime.univerAPI.disposeUnit(previousId)) {
        throw new Error(`Unable to dispose workbook ${previousId} before ${source} restoration.`);
      }
      runtime.workbook = runtime.univerAPI.createWorkbook(cloneSnapshot(snapshot));
      const operationVersion = ++runtime.operationVersion;
      setVerification(null);
      void (async () => {
        try {
          const restoredWorkbook = runtime.workbook;
          if (!(await waitForCalculation(runtime, restoredWorkbook, operationVersion))) return;

          const restoredSheet = restoredWorkbook.getActiveSheet();
          const restoredValues = readProof(restoredWorkbook);
          const averageNumericValue = restoredSheet.getRange('B4').getRawValue();
          if (typeof averageNumericValue !== 'number' || Object.values(restoredValues).some((value) => value === null)) {
            throw new Error(`Snapshot restoration produced incomplete values: ${JSON.stringify(restoredValues)}`);
          }

          setVerification({
            formulas: readFormulas(restoredWorkbook),
            initialValues: restoredValues,
            recalculatedValues: restoredValues,
            averageNumericValue,
            averageDisplayValue: restoredSheet.getRange('B4').getDisplayValue(),
            workbookId: restoredWorkbook.getId(),
            sheetId: restoredSheet.getSheetId(),
            snapshotRestored: restoredSheet.getRange('B4').getNumberFormat() === '0.00',
            initializationMs: 0,
          });
        } catch (caught) {
          if (!runtime.disposed && runtime.operationVersion === operationVersion) {
            setError(caught instanceof Error ? caught.message : 'Unknown Univer spike error');
          }
        }
      })();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown Univer spike error');
    }
  };

  const exportSnapshot = () => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.disposed) return;
    runtime.exportedSnapshot = cloneSnapshot(runtime.workbook.save());
    setSnapshotReady(true);
  };

  return (
    <section>
      <p>
        Client-only Univer proof. Edit the values and formulas directly in the sheet; B4 has an explicit
        <code>0.00</code> number format while retaining its numeric formula result.
      </p>
      <p>
        <button type="button" onClick={exportSnapshot} data-testid="export-snapshot">
          Export native snapshot
        </button>{' '}
        <button
          type="button"
          onClick={() => {
            const runtime = runtimeRef.current;
            if (runtime) restore(runtime.initialSnapshot, 'reset');
          }}
          data-testid="reset-workbook"
        >
          Reset workbook
        </button>{' '}
        <button
          type="button"
          disabled={!snapshotReady}
          onClick={() => {
            const snapshot = runtimeRef.current?.exportedSnapshot;
            if (snapshot) restore(snapshot, 'exported');
          }}
          data-testid="restore-snapshot"
        >
          Restore exported snapshot
        </button>
      </p>
      <div ref={hostRef} data-testid="univer-host" style={{ height: 520, border: '1px solid #cbd5e1' }} />
      {error ? <p role="alert">Univer error: {error}</p> : null}
      {verification ? (
        <pre aria-label="Univer proof results" data-testid="univer-proof-results">
          {JSON.stringify(verification, null, 2)}
        </pre>
      ) : (
        <p data-testid="univer-loading">Initializing and checking formula results…</p>
      )}
    </section>
  );
}
