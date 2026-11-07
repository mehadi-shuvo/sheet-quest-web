'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { SpreadsheetEditorProps } from '../types/spreadsheet.types';
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
      if (runtime) disposeSpreadsheetRuntime(runtime);
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      container.remove();
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

  return { error, hostRef, isBusy: status === 'loading' || status === 'resetting', reset, status };
}
