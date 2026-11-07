'use client';

import { useEffect, useRef } from 'react';
import { useSpreadsheetEditor } from '../hooks/useSpreadsheetEditor';
import type { SpreadsheetEditorProps } from '../types/spreadsheet.types';
import { userFacingSpreadsheetError } from '../utils/spreadsheet-errors';

export function SpreadsheetEditor({ className, initialWorkbook, onError, onReady, onSnapshotController, readOnly, resetRequest = 0 }: SpreadsheetEditorProps) {
  const { error, hostRef, isBusy, reset, snapshotController, status } = useSpreadsheetEditor({
    initialWorkbook,
    onError,
    onReady,
    readOnly,
  });
  const lastResetRequestRef = useRef(resetRequest);

  useEffect(() => {
    if (resetRequest === lastResetRequestRef.current) return;
    lastResetRequestRef.current = resetRequest;
    void reset();
  }, [reset, resetRequest]);

  useEffect(() => {
    onSnapshotController?.(snapshotController);
    return () => onSnapshotController?.(null);
  }, [onSnapshotController, snapshotController]);

  return (
    <div className={className} data-testid="spreadsheet-editor" style={{ height: 520 }}>
      <div
        ref={hostRef}
        aria-busy={isBusy}
        aria-label="Spreadsheet editor"
        data-testid="spreadsheet-editor-host"
        style={{ height: '100%', minHeight: 520 }}
      />
      {status === 'loading' ? <p data-testid="spreadsheet-editor-loading">Loading spreadsheet editor…</p> : null}
      {status === 'ready' ? <p data-testid="spreadsheet-editor-ready">Spreadsheet editor ready.</p> : null}
      {error ? (
        <div role="alert">
          <p>Spreadsheet editor unavailable: {userFacingSpreadsheetError(error)}</p>
          <button type="button" onClick={() => void reset()} disabled={isBusy}>
            Try reset
          </button>
        </div>
      ) : null}
    </div>
  );
}
