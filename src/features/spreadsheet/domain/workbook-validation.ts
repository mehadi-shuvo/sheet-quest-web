import {
  CANONICAL_WORKBOOK_SCHEMA_VERSION,
  DEFAULT_WORKBOOK_SNAPSHOT_LIMITS,
  type CanonicalCellV1,
  type CanonicalCellValue,
  type CanonicalSheetV1,
  type CanonicalWorkbookV1,
  type WorkbookSnapshotLimits,
} from './workbook-types';

const CELL_ADDRESS = /^([A-Z]+)([1-9]\d*)$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class WorkbookValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join(' '));
    this.name = 'WorkbookValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectUnexpectedKeys(record: Record<string, unknown>, allowed: readonly string[], path: string, issues: string[]) {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.has(key) || !allowed.includes(key)) issues.push(`${path}.${key} is not supported.`);
  }
}

function readString(value: unknown, path: string, issues: string[], maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    issues.push(`${path} must be a non-empty string.`);
    return undefined;
  }
  if (value.length > maxLength) issues.push(`${path} exceeds ${maxLength} characters.`);
  return value;
}

function columnIndex(label: string) {
  return [...label].reduce((result, character) => result * 26 + character.charCodeAt(0) - 64, 0);
}

export function compareCellAddresses(left: string, right: string) {
  const leftMatch = CELL_ADDRESS.exec(left);
  const rightMatch = CELL_ADDRESS.exec(right);
  if (!leftMatch || !rightMatch) return left.localeCompare(right);
  const rowDifference = Number(leftMatch[2]) - Number(rightMatch[2]);
  return rowDifference || columnIndex(leftMatch[1]) - columnIndex(rightMatch[1]);
}

function parseCell(
  value: unknown,
  path: string,
  issues: string[],
  limits: WorkbookSnapshotLimits
): CanonicalCellV1 | undefined {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  rejectUnexpectedKeys(value, ['formula', 'numberFormat', 'value'], path, issues);
  const result: CanonicalCellV1 = {};
  if ('value' in value) {
    const cellValue = value.value;
    if (cellValue !== null && typeof cellValue !== 'boolean' && typeof cellValue !== 'number' && typeof cellValue !== 'string') {
      issues.push(`${path}.value must be a primitive value or null.`);
    } else if (typeof cellValue === 'number' && !Number.isFinite(cellValue)) {
      issues.push(`${path}.value must be a finite number.`);
    } else if (typeof cellValue === 'string' && cellValue.length > limits.maxStringLength) {
      issues.push(`${path}.value exceeds ${limits.maxStringLength} characters.`);
    } else {
      result.value = cellValue as CanonicalCellValue;
    }
  }
  if ('formula' in value) {
    const formula = value.formula;
    if (typeof formula !== 'string' || !formula.startsWith('=') || formula.length < 2) {
      issues.push(`${path}.formula must be a non-empty formula beginning with "=".`);
    } else if (formula.length > limits.maxFormulaLength) {
      issues.push(`${path}.formula exceeds ${limits.maxFormulaLength} characters.`);
    } else {
      result.formula = formula;
    }
  }
  if ('numberFormat' in value) {
    const numberFormat = value.numberFormat;
    if (typeof numberFormat !== 'string' || numberFormat.length === 0 || numberFormat.length > 100) {
      issues.push(`${path}.numberFormat must be a 1-100 character string.`);
    } else {
      result.numberFormat = numberFormat;
    }
  }
  if (!('value' in result) && !('formula' in result) && !('numberFormat' in result)) {
    issues.push(`${path} must contain a value, formula, or numberFormat.`);
  }
  return result;
}

function parseSheet(
  value: unknown,
  index: number,
  issues: string[],
  limits: WorkbookSnapshotLimits
): CanonicalSheetV1 | undefined {
  const path = `sheets[${index}]`;
  if (!isRecord(value)) {
    issues.push(`${path} must be an object.`);
    return undefined;
  }
  rejectUnexpectedKeys(value, ['cells', 'columnCount', 'id', 'name', 'rowCount'], path, issues);
  const id = readString(value.id, `${path}.id`, issues, 128);
  const name = readString(value.name, `${path}.name`, issues, 128);
  const rowCount = value.rowCount;
  const columnCount = value.columnCount;
  const validRowCount = typeof rowCount === 'number' && Number.isInteger(rowCount) && rowCount >= 1 && rowCount <= limits.maxRows;
  const validColumnCount =
    typeof columnCount === 'number' && Number.isInteger(columnCount) && columnCount >= 1 && columnCount <= limits.maxColumns;
  if (!validRowCount) {
    issues.push(`${path}.rowCount must be an integer from 1 to ${limits.maxRows}.`);
  }
  if (!validColumnCount) {
    issues.push(`${path}.columnCount must be an integer from 1 to ${limits.maxColumns}.`);
  }
  if (!isRecord(value.cells)) {
    issues.push(`${path}.cells must be an object.`);
    return undefined;
  }
  const cells: Record<string, CanonicalCellV1> = {};
  for (const address of Object.keys(value.cells).sort(compareCellAddresses)) {
    const match = CELL_ADDRESS.exec(address);
    if (!match || Number(match[2]) > limits.maxRows || columnIndex(match[1]) > limits.maxColumns) {
      issues.push(`${path}.cells.${address} is not a supported cell address.`);
      continue;
    }
    const cell = parseCell(value.cells[address], `${path}.cells.${address}`, issues, limits);
    if (cell) cells[address] = cell;
  }
  if (id === undefined || name === undefined || !validRowCount || !validColumnCount) return undefined;
  return { cells, columnCount, id, name, rowCount };
}

export function validateCanonicalWorkbook(
  value: unknown,
  limits: WorkbookSnapshotLimits = DEFAULT_WORKBOOK_SNAPSHOT_LIMITS
): CanonicalWorkbookV1 {
  const issues: string[] = [];
  if (!isRecord(value)) throw new WorkbookValidationError(['Workbook must be a JSON object.']);
  rejectUnexpectedKeys(value, ['id', 'name', 'schemaVersion', 'sheets'], 'workbook', issues);
  if (value.schemaVersion !== CANONICAL_WORKBOOK_SCHEMA_VERSION) {
    issues.push(`workbook.schemaVersion must be ${CANONICAL_WORKBOOK_SCHEMA_VERSION}.`);
  }
  const id = readString(value.id, 'workbook.id', issues, 128);
  const name = readString(value.name, 'workbook.name', issues, 128);
  if (!Array.isArray(value.sheets) || value.sheets.length === 0 || value.sheets.length > limits.maxSheets) {
    issues.push(`workbook.sheets must contain 1 to ${limits.maxSheets} sheets.`);
  }
  const sourceSheets = Array.isArray(value.sheets) ? value.sheets : [];
  const sheets = sourceSheets.map((sheet, index) => parseSheet(sheet, index, issues, limits)).filter((sheet): sheet is CanonicalSheetV1 => Boolean(sheet));
  const ids = new Set<string>();
  const names = new Set<string>();
  let cellCount = 0;
  for (const sheet of sheets) {
    if (ids.has(sheet.id)) issues.push(`Sheet id "${sheet.id}" is duplicated.`);
    if (names.has(sheet.name)) issues.push(`Sheet name "${sheet.name}" is duplicated.`);
    ids.add(sheet.id);
    names.add(sheet.name);
    cellCount += Object.keys(sheet.cells).length;
  }
  if (cellCount > limits.maxCells) issues.push(`Workbook exceeds ${limits.maxCells} populated cells.`);
  if (issues.length || id === undefined || name === undefined || sheets.length !== sourceSheets.length) throw new WorkbookValidationError(issues);
  return {
    id,
    name,
    schemaVersion: CANONICAL_WORKBOOK_SCHEMA_VERSION,
    sheets,
  };
}

export function parseCanonicalWorkbook(
  json: string,
  limits: WorkbookSnapshotLimits = DEFAULT_WORKBOOK_SNAPSHOT_LIMITS
): CanonicalWorkbookV1 {
  if (typeof json !== 'string' || new TextEncoder().encode(json).byteLength > limits.maxJsonBytes) {
    throw new WorkbookValidationError([`Import exceeds the ${limits.maxJsonBytes}-byte limit.`]);
  }
  try {
    return validateCanonicalWorkbook(JSON.parse(json), limits);
  } catch (error) {
    if (error instanceof WorkbookValidationError) throw error;
    throw new WorkbookValidationError(['Import is not valid JSON.']);
  }
}

export function serializeCanonicalWorkbook(workbook: CanonicalWorkbookV1): string {
  const validated = validateCanonicalWorkbook(workbook);
  return JSON.stringify({
    id: validated.id,
    name: validated.name,
    schemaVersion: validated.schemaVersion,
    sheets: validated.sheets.map((sheet) => ({
      cells: Object.fromEntries(Object.entries(sheet.cells).sort(([left], [right]) => compareCellAddresses(left, right))),
      columnCount: sheet.columnCount,
      id: sheet.id,
      name: sheet.name,
      rowCount: sheet.rowCount,
    })),
  });
}
