import type { SpreadsheetCellValue, WorkbookSeed } from './spreadsheet.types';

export type FormulaCompatibilityStatus = 'NOT TESTED' | 'PARTIALLY VERIFIED' | 'UNSUPPORTED' | 'VERIFIED';

export type FormulaExpectation = {
  display?: string;
  result: boolean | number | string;
  resultType: 'boolean' | 'number' | 'string';
  tolerance?: number;
};

export type FormulaCellInput =
  | SpreadsheetCellValue
  | {
      formula: string;
      numberFormat?: string;
    };

export type FormulaRecalculation = {
  cells: Record<string, SpreadsheetCellValue>;
  expected: FormulaExpectation;
};

export type FormulaTestCase = {
  description: string;
  expected: FormulaExpectation;
  formula: string;
  formulaCell: string;
  id: string;
  initialCells: Record<string, FormulaCellInput>;
  recalculation?: FormulaRecalculation;
  status: FormulaCompatibilityStatus;
};

export type FormulaTestFixture = {
  cases: FormulaTestCase[];
  workbook: WorkbookSeed;
};
