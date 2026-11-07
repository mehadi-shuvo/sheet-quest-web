import type { FormulaCellInput, FormulaTestCase, FormulaTestFixture } from '../types/formula-test.types';
import type { SpreadsheetCell, SpreadsheetCellValue, WorkbookSeed } from '../types/spreadsheet.types';

const formulaTestCases: FormulaTestCase[] = [
  {
    id: 'sum',
    description: 'Adds two integers',
    initialCells: { A1: 10, A2: 20 },
    formulaCell: 'A3',
    formula: '=SUM(A1:A2)',
    expected: { result: 30, resultType: 'number' },
    status: 'VERIFIED',
  },
  {
    id: 'average-display',
    description: 'Keeps the numeric AVERAGE result while formatting it to two decimals',
    initialCells: { B1: 4, B2: 5, B3: 4 },
    formulaCell: 'B4',
    formula: '=AVERAGE(B1:B3)',
    expected: { result: 13 / 3, resultType: 'number', display: '4.33', tolerance: 0.0000001 },
    status: 'VERIFIED',
  },
  {
    id: 'average-raw',
    description: 'Preserves the unformatted AVERAGE result for raw-value verification',
    initialCells: { B1: 4, B2: 5, B3: 4 },
    formulaCell: 'B5',
    formula: '=AVERAGE(B1:B3)',
    expected: { result: 13 / 3, resultType: 'number', tolerance: 0.0000001 },
    status: 'VERIFIED',
  },
  {
    id: 'if',
    description: 'Evaluates both branches of IF after an input change',
    initialCells: { C1: 80 },
    formulaCell: 'C2',
    formula: '=IF(C1>=40,"Pass","Fail")',
    expected: { result: 'Pass', resultType: 'string' },
    recalculation: { cells: { C1: 30 }, expected: { result: 'Fail', resultType: 'string' } },
    status: 'VERIFIED',
  },
  {
    id: 'sumif',
    description: 'Sums values matching a text criterion and recalculates',
    initialCells: { D1: 'A', D2: 'B', D3: 'A', E1: 10, E2: 20, E3: 30 },
    formulaCell: 'F1',
    formula: '=SUMIF(D1:D3,"A",E1:E3)',
    expected: { result: 40, resultType: 'number' },
    recalculation: { cells: { E3: 50 }, expected: { result: 60, resultType: 'number' } },
    status: 'VERIFIED',
  },
  {
    id: 'reference',
    description: 'Recalculates a direct cell reference',
    initialCells: { G1: 10 },
    formulaCell: 'G2',
    formula: '=G1*2',
    expected: { result: 20, resultType: 'number' },
    recalculation: { cells: { G1: 15 }, expected: { result: 30, resultType: 'number' } },
    status: 'VERIFIED',
  },
  {
    id: 'nested',
    description: 'Evaluates nested SUM inside IF',
    initialCells: { H1: 10, H2: 20 },
    formulaCell: 'H3',
    formula: '=IF(SUM(H1:H2)>25,"High","Low")',
    expected: { result: 'High', resultType: 'string' },
    recalculation: { cells: { H2: 5 }, expected: { result: 'Low', resultType: 'string' } },
    status: 'VERIFIED',
  },
  {
    id: 'blank-cell',
    description: 'Treats a blank cell as zero in SUM',
    initialCells: { I1: 10, I2: null },
    formulaCell: 'I3',
    formula: '=SUM(I1:I2)',
    expected: { result: 10, resultType: 'number' },
    status: 'VERIFIED',
  },
  {
    id: 'negative-decimal',
    description: 'Sums negative decimal values',
    initialCells: { J1: -10.5, J2: 5.25 },
    formulaCell: 'J3',
    formula: '=SUM(J1:J2)',
    expected: { result: -5.25, resultType: 'number' },
    status: 'VERIFIED',
  },
  {
    id: 'unknown-function',
    description: 'Reports Univer’s unknown-function error',
    initialCells: {},
    formulaCell: 'K1',
    formula: '=UNKNOWN_FUNCTION(1)',
    expected: { result: '#NAME?', resultType: 'string' },
    status: 'VERIFIED',
  },
  {
    id: 'division-by-zero',
    description: 'Reports Univer’s division-by-zero error',
    initialCells: {},
    formulaCell: 'K2',
    formula: '=1/0',
    expected: { result: '#DIV/0!', resultType: 'string' },
    status: 'VERIFIED',
  },
  {
    id: 'malformed-formula',
    description: 'Records the observed error for a malformed formula',
    initialCells: {},
    formulaCell: 'K3',
    formula: '=SUM(',
    expected: { result: '#VALUE!', resultType: 'string' },
    status: 'VERIFIED',
  },
  {
    id: 'circular-reference',
    description: 'Records the observed behavior for a circular reference pair',
    initialCells: { L2: { formula: '=L1' } },
    formulaCell: 'L1',
    formula: '=L2',
    expected: { result: 0, resultType: 'number' },
    status: 'PARTIALLY VERIFIED',
  },
  {
    id: 'relative-reference-source',
    description: 'Provides source values for copy/paste reference translation checks',
    initialCells: { M1: 10, M2: 20 },
    formulaCell: 'N1',
    formula: '=M1*2',
    expected: { result: 20, resultType: 'number' },
    status: 'VERIFIED',
  },
];

function isFormulaCellInput(value: FormulaCellInput): value is Exclude<FormulaCellInput, SpreadsheetCellValue> {
  return typeof value === 'object' && value !== null && 'formula' in value;
}

function cellCoordinates(address: string) {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(address);
  if (!match) throw new Error(`Unsupported formula fixture cell address: ${address}`);

  const column = [...match[1]].reduce((result, character) => result * 26 + character.charCodeAt(0) - 64, 0) - 1;
  return { column, row: Number(match[2]) - 1 };
}

function setCell(
  cellData: Record<number, Record<number, SpreadsheetCell>>,
  address: string,
  value: FormulaCellInput | { formula: string; numberFormat?: string }
) {
  const { column, row } = cellCoordinates(address);
  const rowData = (cellData[row] ??= {});

  if (isFormulaCellInput(value)) {
    rowData[column] = {
      f: value.formula,
      ...(value.numberFormat ? { s: { n: { pattern: value.numberFormat } } } : {}),
    };
    return;
  }

  if (value !== null) rowData[column] = { v: value as SpreadsheetCellValue };
}

function createFormulaWorkbook(cases: FormulaTestCase[]): WorkbookSeed {
  const cellData: Record<number, Record<number, SpreadsheetCell>> = {};

  for (const testCase of cases) {
    for (const [address, value] of Object.entries(testCase.initialCells)) setCell(cellData, address, value);
    setCell(cellData, testCase.formulaCell, {
      formula: testCase.formula,
      numberFormat: testCase.expected.display ? '0.00' : undefined,
    });
  }

  return {
    id: 'formula-compatibility-workbook',
    name: 'Formula compatibility',
    sheetOrder: ['formula-compatibility-sheet'],
    sheets: {
      'formula-compatibility-sheet': {
        id: 'formula-compatibility-sheet',
        name: 'Formula tests',
        rowCount: 100,
        columnCount: 20,
        cellData,
      },
    },
  };
}

export const formulaTestFixture: FormulaTestFixture = {
  cases: formulaTestCases,
  workbook: createFormulaWorkbook(formulaTestCases),
};
