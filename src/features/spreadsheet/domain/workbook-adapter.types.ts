import type { CanonicalCellV1, CanonicalCellValue, CanonicalWorkbookV1 } from './workbook-types';

export type WorkbookAdapterErrorCode =
  | 'DISPOSED'
  | 'EXPORT_FAILED'
  | 'IMPORT_FAILED'
  | 'INTERNAL_ERROR'
  | 'INVALID_INPUT'
  | 'NOT_READY'
  | 'OPERATION_TIMEOUT'
  | 'UNSUPPORTED_FEATURE';

export class WorkbookAdapterError extends Error {
  constructor(
    public readonly code: WorkbookAdapterErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WorkbookAdapterError';
  }
}

export type WorkbookCellAddress = { address: string; sheetId: string };

export type WorkbookCellInput = Pick<CanonicalCellV1, 'formula' | 'numberFormat' | 'value'>;

export type WorkbookCalculatedValue = {
  display: string;
  value: CanonicalCellValue | undefined;
};

export type WorkbookAdapter = {
  exportWorkbook(): Promise<CanonicalWorkbookV1>;
  getCalculatedValue(cell: WorkbookCellAddress): Promise<WorkbookCalculatedValue>;
  getCellInput(cell: WorkbookCellAddress): Promise<WorkbookCellInput | undefined>;
  getReadiness(): 'disposed' | 'ready';
  importWorkbook(workbook: CanonicalWorkbookV1): Promise<void>;
  reset(): Promise<void>;
  setCellInput(cell: WorkbookCellAddress, input: WorkbookCellInput): Promise<void>;
};
