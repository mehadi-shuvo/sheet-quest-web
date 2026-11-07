import { describe, expect, it } from 'vitest';
import { canonicalToUniverWorkbookSeed, univerSnapshotToCanonical } from '../lib/univer/univer-snapshot.codec';
import { parseCanonicalWorkbook, serializeCanonicalWorkbook, WorkbookValidationError } from './workbook-validation';
import type { CanonicalWorkbookV1 } from './workbook-types';

const workbook: CanonicalWorkbookV1 = {
  id: 'canonical-test',
  name: 'Canonical test',
  schemaVersion: 1,
  sheets: [
    {
      id: 'summary',
      name: 'Summary',
      rowCount: 100,
      columnCount: 20,
      cells: {
        B1: { value: 10 },
        A1: { value: 'Text' },
        C1: { formula: '=B1*2', numberFormat: '0.00' },
        A2: { value: true },
        B2: { value: null },
      },
    },
    { id: 'inputs', name: 'Inputs', rowCount: 10, columnCount: 10, cells: { A1: { value: 25 } } },
  ],
};

describe('canonical workbook v1', () => {
  it('serializes deterministically without mutating input', () => {
    const before = structuredClone(workbook);
    const first = serializeCanonicalWorkbook(workbook);
    expect(first).toBe(serializeCanonicalWorkbook(parseCanonicalWorkbook(first)));
    expect(workbook).toEqual(before);
    expect(first.indexOf('"A1"')).toBeLessThan(first.indexOf('"B1"'));
  });

  it('round trips supported cells, formats, sheet order, and native seed conversion', () => {
    const parsed = parseCanonicalWorkbook(serializeCanonicalWorkbook(workbook));
    const seed = canonicalToUniverWorkbookSeed(parsed);
    expect(seed.sheetOrder).toEqual(['summary', 'inputs']);
    expect(seed.sheets.summary.cellData?.[0][2]).toEqual({ f: '=B1*2', s: { n: { pattern: '0.00' } } });
    expect(seed.sheets.summary.cellData?.[1][1]).toEqual({ v: null });
  });

  it.each([
    ['malformed JSON', '{'],
    ['unsupported version', JSON.stringify({ ...workbook, schemaVersion: 2 })],
    ['duplicate sheet id', JSON.stringify({ ...workbook, sheets: [workbook.sheets[0], { ...workbook.sheets[1], id: 'summary' }] })],
    ['invalid address', JSON.stringify({ ...workbook, sheets: [{ ...workbook.sheets[0], cells: { A0: { value: 1 } } }] })],
    ['unsupported value', JSON.stringify({ ...workbook, sheets: [{ ...workbook.sheets[0], cells: { A1: { value: {} } } }] })],
  ])('rejects %s', (_name, json) => {
    expect(() => parseCanonicalWorkbook(json)).toThrow(WorkbookValidationError);
  });

  it('rejects excessive input and unexpected fields', () => {
    expect(() => parseCanonicalWorkbook('x'.repeat(1_000_001))).toThrow(/exceeds/);
    expect(() => parseCanonicalWorkbook(JSON.stringify({ ...workbook, unexpected: true }))).toThrow(/not supported/);
  });

  it('extracts supported cells from an actual-shaped Univer snapshot without cached formula values', () => {
    const canonical = univerSnapshotToCanonical({
      id: 'native', name: 'Native', appVersion: '1.3.1', locale: 'en-US' as never, styles: { style1: { n: { pattern: '0.00' } } },
      sheetOrder: ['sheet'], sheets: { sheet: { id: 'sheet', name: 'Sheet', rowCount: 10, columnCount: 10, cellData: { 0: { 0: { v: 10 }, 1: { f: '=A1*2', v: 20, s: 'style1' } } } } },
    } as never);
    expect(canonical.sheets[0].cells).toEqual({ A1: { value: 10 }, B1: { formula: '=A1*2', numberFormat: '0.00' } });
  });
});
