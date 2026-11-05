'use client';

import { useEffect, useRef, useState } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import '@univerjs/preset-sheets-core/lib/index.css';

type Verification = {
  formulas: Record<string, string>;
  initialValues: Record<string, unknown>;
  recalculatedValues: Record<string, unknown>;
  snapshotRestored: boolean;
};

const EXPECTED_INITIAL_VALUES = { B1: 18, B2: 6, B3: 'pass', B4: 15 };
const EXPECTED_RECALCULATED_VALUES = { B1: 21, B2: 7, B3: 'pass', B4: 18 };

export function UniverSpreadsheetSpike() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const container = document.createElement('div');
    container.style.height = '100%';
    host.append(container);

    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [UniverSheetsCorePreset({ container })],
    });

    const workbook = univerAPI.createWorkbook({ name: 'Formula proof' });
    const sheet = workbook.getActiveSheet();
    sheet.getRange('A1:A3').setValues([[5], [10], [3]]);
    sheet.getRange('B1').setFormula('=SUM(A1:A3)');
    sheet.getRange('B2').setFormula('=AVERAGE(A1:A3)');
    sheet.getRange('B3').setFormula('=IF(A1>4,"pass","fail")');
    sheet.getRange('B4').setFormula('=SUMIF(A1:A3,">=5")');

    const timer = window.setTimeout(() => {
      try {
        const readValues = () => ({
          B1: sheet.getRange('B1').getValue(),
          B2: sheet.getRange('B2').getValue(),
          B3: sheet.getRange('B3').getValue(),
          B4: sheet.getRange('B4').getValue(),
        });

        const initialValues = readValues();
        const formulas = {
          B1: sheet.getRange('B1').getFormula(),
          B2: sheet.getRange('B2').getFormula(),
          B3: sheet.getRange('B3').getFormula(),
          B4: sheet.getRange('B4').getFormula(),
        };
        const snapshot = JSON.parse(JSON.stringify(workbook.save()));
        const restored = univerAPI.createWorkbook(snapshot, { makeCurrent: false });
        const restoredFormula = restored.getActiveSheet().getRange('B4').getFormula();
        univerAPI.disposeUnit(restored.getId());

        sheet.getRange('A1').setValue(8);
        window.setTimeout(() => {
          const recalculatedValues = readValues();
          const initialMatch = JSON.stringify(initialValues) === JSON.stringify(EXPECTED_INITIAL_VALUES);
          const recalculationMatch = JSON.stringify(recalculatedValues) === JSON.stringify(EXPECTED_RECALCULATED_VALUES);
          setVerification({
            formulas,
            initialValues,
            recalculatedValues,
            snapshotRestored: restoredFormula === formulas.B4 && initialMatch && recalculationMatch,
          });
        }, 100);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unknown Univer spike error');
      }
    }, 100);

    return () => {
      window.clearTimeout(timer);
      queueMicrotask(() => {
        univer.dispose();
        container.remove();
      });
    };
  }, []);

  return (
    <section>
      <p>Client-only Univer proof: edit column A and observe formulas in column B.</p>
      <div ref={hostRef} style={{ height: 520, border: '1px solid #cbd5e1' }} />
      {error ? <p role="alert">Univer error: {error}</p> : null}
      {verification ? (
        <pre aria-label="Univer proof results">{JSON.stringify(verification, null, 2)}</pre>
      ) : (
        <p>Initializing and checking formula results…</p>
      )}
    </section>
  );
}
