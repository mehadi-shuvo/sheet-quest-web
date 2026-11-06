'use client';

type SpreadsheetToolbarProps = {
  busy: boolean;
  onReset: () => void;
};

export function SpreadsheetToolbar({ busy, onReset }: SpreadsheetToolbarProps) {
  return (
    <div aria-label="Spreadsheet controls" role="toolbar">
      <button type="button" onClick={onReset} disabled={busy} data-testid="reset-practice-workbook">
        {busy ? 'Resetting workbook…' : 'Reset workbook'}
      </button>
      <span aria-live="polite">{busy ? 'Please wait while the workbook is prepared.' : ''}</span>
    </div>
  );
}
