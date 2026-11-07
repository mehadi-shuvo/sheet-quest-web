import { canonicalToUniverWorkbookSeed, univerSnapshotToCanonical } from '../lib/univer/univer-snapshot.codec';
import { replaceWorkbookSeed, type SpreadsheetRuntime } from '../lib/univer/workbook-lifecycle';
import { parseCanonicalWorkbook, serializeCanonicalWorkbook } from '../domain/workbook-validation';

export function exportCanonicalWorkbook(runtime: SpreadsheetRuntime) {
  if (runtime.disposed) throw new Error('The spreadsheet is no longer available for export.');
  return serializeCanonicalWorkbook(univerSnapshotToCanonical(runtime.workbook.save()));
}

export function prepareCanonicalWorkbookImport(json: string) {
  return canonicalToUniverWorkbookSeed(parseCanonicalWorkbook(json));
}

export function applyCanonicalWorkbookImport(runtime: SpreadsheetRuntime, json: string) {
  const candidate = prepareCanonicalWorkbookImport(json);
  return applyPreparedCanonicalWorkbookImport(runtime, candidate);
}

export function applyPreparedCanonicalWorkbookImport(
  runtime: SpreadsheetRuntime,
  candidate: ReturnType<typeof prepareCanonicalWorkbookImport>
) {
  runtime.operationVersion += 1;
  return { operationVersion: runtime.operationVersion, workbook: replaceWorkbookSeed(runtime, candidate), seed: candidate };
}
