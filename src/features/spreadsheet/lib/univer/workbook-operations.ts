import { replaceWorkbook, type SpreadsheetRuntime } from './workbook-lifecycle';

export function resetWorkbook(runtime: SpreadsheetRuntime) {
  runtime.operationVersion += 1;
  return {
    operationVersion: runtime.operationVersion,
    workbook: replaceWorkbook(runtime, runtime.initialSnapshot),
  };
}
