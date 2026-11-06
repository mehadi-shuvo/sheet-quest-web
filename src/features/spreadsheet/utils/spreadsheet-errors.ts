export function toSpreadsheetError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

export function userFacingSpreadsheetError(error: Error): string {
  return error.message || 'The spreadsheet editor could not complete that action.';
}
