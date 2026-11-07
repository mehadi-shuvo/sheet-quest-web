import type { IWorkbookData } from '@univerjs/core';
import type { CanonicalCellV1, CanonicalWorkbookV1 } from '../../domain/workbook-types';
import { validateCanonicalWorkbook } from '../../domain/workbook-validation';
import type { SpreadsheetCell, WorkbookSeed } from '../../types/spreadsheet.types';

type NativeCell = { f?: unknown; s?: unknown; v?: unknown };

function addressFor(row: number, column: number) {
  let remaining = column + 1;
  let label = '';
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return `${label}${row + 1}`;
}

function coordinatesFor(address: string) {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address);
  if (!match) throw new Error(`Unsupported canonical address: ${address}`);
  const column = [...match[1]].reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
  return { column, row: Number(match[2]) - 1 };
}

function numberFormat(cell: NativeCell, styles: Record<string, unknown>): string | undefined {
  const style = typeof cell.s === 'string' ? styles[cell.s] : cell.s;
  if (typeof style !== 'object' || style === null || !('n' in style)) return undefined;
  const number = (style as { n?: unknown }).n;
  if (typeof number !== 'object' || number === null || !('pattern' in number)) return undefined;
  const pattern = (number as { pattern?: unknown }).pattern;
  return typeof pattern === 'string' ? pattern : undefined;
}

function canonicalCell(cell: NativeCell, styles: Record<string, unknown>): CanonicalCellV1 | undefined {
  const result: CanonicalCellV1 = {};
  if (typeof cell.f === 'string') result.formula = cell.f;
  if (!result.formula && (cell.v === null || typeof cell.v === 'string' || typeof cell.v === 'number' || typeof cell.v === 'boolean')) {
    result.value = cell.v;
  }
  const format = numberFormat(cell, styles);
  if (format) result.numberFormat = format;
  return Object.keys(result).length ? result : undefined;
}

export function univerSnapshotToCanonical(snapshot: IWorkbookData): CanonicalWorkbookV1 {
  const styles = snapshot.styles as Record<string, unknown>;
  const sheets = snapshot.sheetOrder.map((sheetId) => {
    const sheet = snapshot.sheets[sheetId];
    if (!sheet || typeof sheet.id !== 'string' || typeof sheet.name !== 'string') {
      throw new Error(`Univer snapshot is missing sheet "${sheetId}".`);
    }
    const cells: Record<string, CanonicalCellV1> = {};
    for (const [rowKey, row] of Object.entries(sheet.cellData ?? {})) {
      const rowIndex = Number(rowKey);
      if (!Number.isInteger(rowIndex) || !row) continue;
      for (const [columnKey, value] of Object.entries(row)) {
        const columnIndex = Number(columnKey);
        if (!Number.isInteger(columnIndex) || !value) continue;
        const cell = canonicalCell(value as NativeCell, styles);
        if (cell) cells[addressFor(rowIndex, columnIndex)] = cell;
      }
    }
    return {
      cells,
      columnCount: sheet.columnCount ?? 20,
      id: sheet.id,
      name: sheet.name,
      rowCount: sheet.rowCount ?? 100,
    };
  });
  return validateCanonicalWorkbook({ id: snapshot.id, name: snapshot.name, schemaVersion: 1, sheets });
}

export function canonicalToUniverWorkbookSeed(workbook: CanonicalWorkbookV1): WorkbookSeed {
  const validated = validateCanonicalWorkbook(workbook);
  return {
    id: validated.id,
    name: validated.name,
    sheetOrder: validated.sheets.map((sheet) => sheet.id),
    sheets: Object.fromEntries(
      validated.sheets.map((sheet) => {
        const cellData: Record<number, Record<number, SpreadsheetCell>> = {};
        for (const [address, canonicalCell] of Object.entries(sheet.cells)) {
          const { column, row } = coordinatesFor(address);
          const nativeCell: SpreadsheetCell = {};
          if (canonicalCell.formula) nativeCell.f = canonicalCell.formula;
          else if ('value' in canonicalCell) nativeCell.v = canonicalCell.value;
          if (canonicalCell.numberFormat) nativeCell.s = { n: { pattern: canonicalCell.numberFormat } };
          (cellData[row] ??= {})[column] = nativeCell;
        }
        return [sheet.id, { cellData, columnCount: sheet.columnCount, id: sheet.id, name: sheet.name, rowCount: sheet.rowCount }];
      })
    ),
  };
}
