'use client';

import { useState } from 'react';
import type { SpreadsheetSnapshotController } from '../types/spreadsheet.types';

type SpreadsheetSnapshotPanelProps = {
  controller: SpreadsheetSnapshotController | null;
};

export function SpreadsheetSnapshotPanel({ controller }: SpreadsheetSnapshotPanelProps) {
  const [json, setJson] = useState('');
  const [message, setMessage] = useState('');

  return (
    <section aria-label="Canonical workbook snapshot">
      <h2>Canonical workbook JSON</h2>
      <p>Export and import the application-owned schema v1. Invalid JSON leaves the active workbook unchanged.</p>
      <div role="group" aria-label="Snapshot controls">
        <button
          type="button"
          data-testid="export-canonical-workbook"
          disabled={!controller}
          onClick={() => {
            try {
              setJson(controller?.exportCanonicalWorkbook() ?? '');
              setMessage('Canonical workbook exported.');
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Workbook export failed.');
            }
          }}
        >
          Export canonical JSON
        </button>
        <button
          type="button"
          data-testid="import-canonical-workbook"
          disabled={!controller || !json}
          onClick={() => {
            void (async () => {
              try {
                await controller?.importCanonicalWorkbook(json);
                setMessage('Canonical workbook imported.');
              } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Workbook import failed.');
              }
            })();
          }}
        >
          Import canonical JSON
        </button>
      </div>
      <label htmlFor="canonical-workbook-json">Canonical workbook JSON</label>
      <textarea
        id="canonical-workbook-json"
        data-testid="canonical-workbook-json"
        value={json}
        onChange={(event) => setJson(event.target.value)}
        rows={12}
        spellCheck={false}
      />
      <p aria-live="polite" data-testid="snapshot-operation-status">{message}</p>
    </section>
  );
}
