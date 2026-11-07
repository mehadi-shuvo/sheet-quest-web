import type { SpreadsheetExercise } from '../types/spreadsheet.types';

export const snapshotExercise: SpreadsheetExercise = {
  id: 'snapshot-round-trip',
  title: 'Canonical workbook snapshot round trip',
  instructions: 'Edit the workbook, export canonical JSON, then import it to verify values, formulas, formats, and sheet order.',
  workbook: {
    id: 'snapshot-round-trip-workbook',
    name: 'Snapshot round trip',
    sheetOrder: ['snapshot-summary', 'snapshot-inputs'],
    sheets: {
      'snapshot-summary': {
        id: 'snapshot-summary',
        name: 'Summary',
        rowCount: 100,
        columnCount: 20,
        cellData: {
          0: { 0: { v: 'Amount' }, 1: { v: 10 }, 2: { f: '=B1*2', s: { n: { pattern: '0.00' } } } },
          1: { 0: { v: true }, 1: { v: null }, 2: { f: '=SUM(B1:B2)' } },
        },
      },
      'snapshot-inputs': {
        id: 'snapshot-inputs',
        name: 'Inputs',
        rowCount: 100,
        columnCount: 20,
        cellData: { 0: { 0: { v: 'Second sheet' }, 1: { v: 25 } } },
      },
    },
  },
};
