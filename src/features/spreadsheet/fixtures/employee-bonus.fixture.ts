import type { SpreadsheetExercise } from '../types/spreadsheet.types';

export const employeeBonusExercise: SpreadsheetExercise = {
  id: 'employee-bonus',
  title: 'Employee bonus calculation',
  instructions: 'In cell C2, enter a formula that calculates Rahim’s 10% bonus from salary.',
  workbook: {
    id: 'employee-bonus-workbook',
    name: 'Employee bonus practice',
    sheetOrder: ['employee-bonus-sheet'],
    sheets: {
      'employee-bonus-sheet': {
        id: 'employee-bonus-sheet',
        name: 'Bonus practice',
        rowCount: 100,
        columnCount: 20,
        cellData: {
          0: {
            0: { v: 'Employee' },
            1: { v: 'Salary' },
            2: { v: 'Bonus' },
          },
          1: {
            0: { v: 'Rahim' },
            1: { v: 50000 },
          },
          2: {
            0: { v: 'Karim' },
            1: { v: 40000 },
          },
        },
      },
    },
  },
};
