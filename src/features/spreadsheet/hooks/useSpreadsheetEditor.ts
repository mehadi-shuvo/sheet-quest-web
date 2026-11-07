'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSpreadsheetUniver } from '../lib/univer/create-univer';
import {
  createSpreadsheetRuntime,
  disposeSpreadsheetRuntime,
  type SpreadsheetRuntime,
  waitForFormulaCalculation,
  waitForRendered,
  workbookSeedHasFormulas,
} from '../lib/univer/workbook-lifecycle';
import { resetWorkbook } from '../lib/univer/workbook-operations';
import {
  applyPreparedCanonicalWorkbookImport,
  prepareCanonicalWorkbookImport,
} from '../services/workbook-snapshot.service';
import { UniverWorkbookAdapter } from '@/adapters/univer-workbook.adapter';
import { parseCanonicalWorkbook, serializeCanonicalWorkbook } from '../domain/workbook-validation';
import type { SpreadsheetEditorProps, SpreadsheetSnapshotController } from '../types/spreadsheet.types';
import { toSpreadsheetError } from '../utils/spreadsheet-errors';

type EditorStatus = 'error' | 'idle' | 'loading' | 'ready' | 'resetting';

type UseSpreadsheetEditorOptions = Pick<SpreadsheetEditorProps, 'initialWorkbook' | 'onError' | 'onReady' | 'readOnly'>;

export function useSpreadsheetEditor({ initialWorkbook, onError, onReady, readOnly = false }: UseSpreadsheetEditorOptions) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SpreadsheetRuntime | null>(null);
  const callbacksRef = useRef({ onError, onReady });
  const readOnlyRef = useRef(readOnly);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<EditorStatus>('idle');

  callbacksRef.current = { onError, onReady };
  readOnlyRef.current = readOnly;

  const reportError = useCallback((caught: unknown, fallback: string) => {
    const nextError = toSpreadsheetError(caught, fallback);
    setError(nextError);
    setStatus('error');
    callbacksRef.current.onError?.(nextError);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const container = document.createElement('div');
    container.style.height = '100%';
    host.append(container);
    setError(null);
    setStatus('loading');

    let runtime: SpreadsheetRuntime | null = null;
    try {
      const { univer, univerAPI } = createSpreadsheetUniver(container);
      runtime = createSpreadsheetRuntime(univer, univerAPI, initialWorkbook);
      runtime.operationVersion += 1;
      runtimeRef.current = runtime;

      void (async () => {
        try {
          const ready = workbookSeedHasFormulas(initialWorkbook)
            ? await waitForFormulaCalculation(runtime, runtime.workbook, runtime.operationVersion)
            : await waitForRendered(runtime, runtime.operationVersion);
          if (!ready) return;

          runtime.workbook.setEditable(!readOnlyRef.current);
          setStatus('ready');
          callbacksRef.current.onReady?.();
        } catch (caught) {
          if (!runtime?.disposed) reportError(caught, 'The spreadsheet editor could not initialize.');
        }
      })();
    } catch (caught) {
      reportError(caught, 'The spreadsheet editor could not initialize.');
    }

    return () => {
      if (runtime) disposeSpreadsheetRuntime(runtime, () => container.remove());
      else container.remove();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [initialWorkbook, reportError]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.disposed) return;
    runtime.workbook.setEditable(!readOnly);
  }, [readOnly]);

  const reset = useCallback(async () => {
    const runtime = runtimeRef.current;
    if (!runtime || runtime.disposed || status === 'resetting') return;

    setError(null);
    setStatus('resetting');
    try {
      if (workbookSeedHasFormulas(initialWorkbook)) {
        const settled = await waitForFormulaCalculation(runtime, runtime.workbook, runtime.operationVersion);
        if (!settled) return;
      }
      const { operationVersion, workbook } = resetWorkbook(runtime);
      const completed = workbookSeedHasFormulas(initialWorkbook)
        ? await waitForFormulaCalculation(runtime, workbook, operationVersion)
        : await waitForRendered(runtime, operationVersion);
      if (!completed) return;
      workbook.setEditable(!readOnlyRef.current);
      setStatus('ready');
      callbacksRef.current.onReady?.();
    } catch (caught) {
      if (!runtime.disposed) reportError(caught, 'The workbook could not be reset.');
    }
  }, [initialWorkbook, reportError, status]);

  const importCanonicalJson = useCallback(async (json: string) => {
      const runtime = runtimeRef.current;
      if (!runtime || runtime.disposed || status === 'resetting') throw new Error('The spreadsheet editor is not ready for import.');
      const candidate = prepareCanonicalWorkbookImport(json);
      setError(null);
      setStatus('resetting');
      try {
        const { operationVersion, seed, workbook } = applyPreparedCanonicalWorkbookImport(runtime, candidate);
        const completed = workbookSeedHasFormulas(seed)
          ? await waitForFormulaCalculation(runtime, workbook, operationVersion)
          : await waitForRendered(runtime, operationVersion);
        if (!completed) throw new Error('The imported workbook was superseded before it became ready.');
        workbook.setEditable(!readOnlyRef.current);
        setStatus('ready');
        callbacksRef.current.onReady?.();
      } catch (caught) {
        if (!runtime.disposed) {
          setStatus('ready');
          throw toSpreadsheetError(caught, 'The workbook import failed.');
        }
      }
  }, [status]);

  const adapter = useMemo(
    () => new UniverWorkbookAdapter({ importJson: importCanonicalJson, reset, runtime: () => runtimeRef.current }),
    [importCanonicalJson, reset]
  );

  const exportWorkbook = useCallback(() => {
      return adapter.exportWorkbook().then(serializeCanonicalWorkbook);
  }, [adapter]);

  const importWorkbook = useCallback(async (json: string) => {
      await adapter.importWorkbook(parseCanonicalWorkbook(json));
  }, [adapter]);

  const snapshotController = useMemo<SpreadsheetSnapshotController>(
    () => ({ exportCanonicalWorkbook: exportWorkbook, importCanonicalWorkbook: importWorkbook }),
    [exportWorkbook, importWorkbook]
  );

  return { error, hostRef, isBusy: status === 'loading' || status === 'resetting', reset, snapshotController, status };
}
