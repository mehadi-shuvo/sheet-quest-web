'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { SpreadsheetExercise } from '../types/spreadsheet.types';
import { SpreadsheetErrorBoundary } from './SpreadsheetErrorBoundary';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';

const SpreadsheetEditor = dynamic(
  () => import('./SpreadsheetEditor').then((module) => module.SpreadsheetEditor),
  {
    loading: () => <p data-testid="spreadsheet-editor-loading">Loading spreadsheet editor…</p>,
    ssr: false,
  }
);

type SpreadsheetWorkspaceProps = { exercise: SpreadsheetExercise };

export function SpreadsheetWorkspace({ exercise }: SpreadsheetWorkspaceProps) {
  const [editorKey, setEditorKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  return (
    <section aria-labelledby="practice-title" data-testid="spreadsheet-workspace">
      <header>
        <p>Practice exercise</p>
        <h1 id="practice-title">{exercise.title}</h1>
        <p>{exercise.instructions}</p>
      </header>
      <SpreadsheetToolbar
        busy={resetRequested}
        onReset={() => {
          if (window.confirm('Reset the workbook and discard all edits?')) {
            setReady(false);
            setResetRequested(true);
            setEditorKey((request) => request + 1);
          }
        }}
      />
      <SpreadsheetErrorBoundary>
        <SpreadsheetEditor
          key={editorKey}
          className="spreadsheet-editor"
          initialWorkbook={exercise.workbook}
          onError={() => setResetRequested(false)}
          onReady={() => {
            setReady(true);
            setResetRequested(false);
          }}
          resetRequest={editorKey}
        />
      </SpreadsheetErrorBoundary>
      <p aria-live="polite">{ready ? 'Workbook ready for editing.' : 'Preparing workbook…'}</p>
    </section>
  );
}
