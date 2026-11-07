# WorkbookAdapter contract

`WorkbookAdapter` is the lesson-facing contract for the verified spreadsheet subset. The current `UniverWorkbookAdapter` is an implementation detail: it receives the existing editor runtime and operations, never creates an additional Univer instance, and is the only adapter implementation that imports Univer facade APIs.

```ts
type WorkbookAdapter = {
  getReadiness(): 'ready' | 'disposed';
  getCellInput(cell): Promise<CellInput | undefined>;
  setCellInput(cell, input): Promise<void>;
  getCalculatedValue(cell): Promise<{ value; display }>;
  exportWorkbook(): Promise<CanonicalWorkbookV1>;
  importWorkbook(workbook): Promise<void>;
  reset(): Promise<void>;
};
```

Cell input preserves raw `formula`, primitive `value`, and `numberFormat`; calculated values separately expose raw value and display text. Addresses use uppercase A1 notation plus a canonical sheet ID. The contract rejects invalid addresses and unknown sheets. Formula writes wait for Univer calculation application; any operation after disposal returns a typed `DISPOSED` or `NOT_READY` error.

Errors are typed as `INVALID_INPUT`, `UNSUPPORTED_FEATURE`, `NOT_READY`, `DISPOSED`, `OPERATION_TIMEOUT`, `IMPORT_FAILED`, `EXPORT_FAILED`, or `INTERNAL_ERROR`. UI must display a safe message while retaining the underlying cause only for diagnostics.

## Capability boundary

| Capability | Status |
| --- | --- |
| Primitive values, editing, copy/paste, selection | VERIFIED |
| Formulas, basic number formats, reset, canonical snapshots, multiple sheets | VERIFIED |
| Circular references | PARTIALLY VERIFIED; not lesson-supported |
| Charts, images, named ranges, complex formatting, XLSX import/export | UNSUPPORTED |
| Large workbooks and browsers outside Chromium | NOT TESTED |

Canonical schema v1 remains the import/export format. The adapter does not expose native snapshots, plugin data, or Univer instances to lesson code.
