export const WORKBOOK_CAPABILITIES = {
  basicFormatting: 'VERIFIED',
  booleanValues: 'VERIFIED',
  canonicalSnapshots: 'VERIFIED',
  charts: 'UNSUPPORTED',
  circularReferences: 'PARTIALLY_VERIFIED',
  complexFormatting: 'UNSUPPORTED',
  copyPaste: 'VERIFIED',
  editing: 'VERIFIED',
  formulas: 'VERIFIED',
  images: 'UNSUPPORTED',
  largeWorkbooks: 'NOT_TESTED',
  multipleSheets: 'VERIFIED',
  namedRanges: 'UNSUPPORTED',
  reset: 'VERIFIED',
  selection: 'VERIFIED',
  xlsxImportExport: 'UNSUPPORTED',
} as const;

export type WorkbookCapability = keyof typeof WORKBOOK_CAPABILITIES;
export type WorkbookCapabilityStatus = (typeof WORKBOOK_CAPABILITIES)[WorkbookCapability];
