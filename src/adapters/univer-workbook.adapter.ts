import { univerSnapshotToCanonical } from '@/features/spreadsheet/lib/univer/univer-snapshot.codec';
import { waitForFormulaCalculation, type SpreadsheetRuntime } from '@/features/spreadsheet/lib/univer/workbook-lifecycle';
import type {
  WorkbookAdapter,
  WorkbookCalculatedValue,
  WorkbookCellAddress,
  WorkbookCellInput,
} from '@/features/spreadsheet/domain/workbook-adapter.types';
import { WorkbookAdapterError } from '@/features/spreadsheet/domain/workbook-adapter.types';
import type { CanonicalWorkbookV1 } from '@/features/spreadsheet/domain/workbook-types';
import { serializeCanonicalWorkbook } from '@/features/spreadsheet/domain/workbook-validation';

type UniverAdapterOperations = {
  importJson(json: string): Promise<void>;
  reset(): Promise<void>;
  runtime(): SpreadsheetRuntime | null;
};

function assertAddress(address: string) {
  if (!/^[A-Z]+[1-9]\d*$/.test(address)) {
    throw new WorkbookAdapterError('INVALID_INPUT', `Invalid cell address: ${address}`);
  }
}

export class UniverWorkbookAdapter implements WorkbookAdapter {
  constructor(private readonly operations: UniverAdapterOperations) {}

  private runtime() {
    const runtime = this.operations.runtime();
    if (!runtime) throw new WorkbookAdapterError('NOT_READY', 'The workbook adapter is not ready.');
    if (runtime.disposed) throw new WorkbookAdapterError('DISPOSED', 'The workbook adapter has been disposed.');
    return runtime;
  }

  private sheet(runtime: SpreadsheetRuntime, sheetId: string) {
    const sheet = runtime.workbook.getSheets().find((candidate) => candidate.getSheetId() === sheetId);
    if (!sheet) throw new WorkbookAdapterError('INVALID_INPUT', `Unknown sheet: ${sheetId}`);
    return sheet;
  }

  getReadiness() {
    const runtime = this.operations.runtime();
    return !runtime || runtime.disposed ? 'disposed' : 'ready';
  }

  async getCellInput(cell: WorkbookCellAddress) {
    assertAddress(cell.address);
    const workbook = univerSnapshotToCanonical(this.runtime().workbook.save());
    const sheet = workbook.sheets.find((candidate) => candidate.id === cell.sheetId);
    if (!sheet) throw new WorkbookAdapterError('INVALID_INPUT', `Unknown sheet: ${cell.sheetId}`);
    return sheet.cells[cell.address];
  }

  async getCalculatedValue(cell: WorkbookCellAddress): Promise<WorkbookCalculatedValue> {
    assertAddress(cell.address);
    const range = this.sheet(this.runtime(), cell.sheetId).getRange(cell.address);
    const value = range.getValue();
    if (value !== null && typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string') {
      throw new WorkbookAdapterError('INTERNAL_ERROR', `Unsupported calculated value at ${cell.address}.`);
    }
    return { display: range.getDisplayValue(), value: value ?? undefined };
  }

  async setCellInput(cell: WorkbookCellAddress, input: WorkbookCellInput) {
    assertAddress(cell.address);
    if (!input.formula && !('value' in input)) {
      throw new WorkbookAdapterError('INVALID_INPUT', 'A cell input must contain a formula or value.');
    }
    const runtime = this.runtime();
    const range = this.sheet(runtime, cell.sheetId).getRange(cell.address);
    if (input.formula) range.setFormula(input.formula);
    else if (input.value === null) range.clearContent();
    else range.setValue(input.value ?? '');
    if (input.numberFormat) range.setNumberFormat(input.numberFormat);
    const completed = await waitForFormulaCalculation(runtime, runtime.workbook, runtime.operationVersion);
    if (!completed) throw new WorkbookAdapterError('DISPOSED', 'The workbook was replaced while updating a cell.');
  }

  async exportWorkbook() {
    try {
      return univerSnapshotToCanonical(this.runtime().workbook.save());
    } catch (cause) {
      throw new WorkbookAdapterError('EXPORT_FAILED', 'Canonical workbook export failed.', cause);
    }
  }

  async importWorkbook(workbook: CanonicalWorkbookV1) {
    try {
      await this.operations.importJson(serializeCanonicalWorkbook(workbook));
    } catch (cause) {
      throw new WorkbookAdapterError('IMPORT_FAILED', 'Canonical workbook import failed.', cause);
    }
  }

  async reset() {
    await this.operations.reset();
  }
}
