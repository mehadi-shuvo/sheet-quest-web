export const CANONICAL_WORKBOOK_SCHEMA_VERSION = 1 as const;

export type CanonicalCellValue = boolean | null | number | string;

export type CanonicalCellV1 = {
  formula?: string;
  numberFormat?: string;
  value?: CanonicalCellValue;
};

export type CanonicalSheetV1 = {
  cells: Record<string, CanonicalCellV1>;
  columnCount: number;
  id: string;
  name: string;
  rowCount: number;
};

export type CanonicalWorkbookV1 = {
  id: string;
  name: string;
  schemaVersion: typeof CANONICAL_WORKBOOK_SCHEMA_VERSION;
  sheets: CanonicalSheetV1[];
};

export type WorkbookSnapshotLimits = {
  maxCells: number;
  maxColumns: number;
  maxFormulaLength: number;
  maxJsonBytes: number;
  maxSheets: number;
  maxStringLength: number;
  maxRows: number;
};

export const DEFAULT_WORKBOOK_SNAPSHOT_LIMITS: WorkbookSnapshotLimits = {
  maxCells: 10_000,
  maxColumns: 100,
  maxFormulaLength: 8_192,
  maxJsonBytes: 1_000_000,
  maxRows: 1_000,
  maxSheets: 32,
  maxStringLength: 32_768,
};
