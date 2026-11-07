export { SpreadsheetWorkspace } from './components/SpreadsheetWorkspace';
export { employeeBonusExercise } from './fixtures/employee-bonus.fixture';
export { formulaTestFixture } from './fixtures/formula-test-cases';
export { snapshotExercise } from './fixtures/snapshot-test.fixture';
export { WORKBOOK_CAPABILITIES } from './domain/workbook-capabilities';
export { WorkbookAdapterError } from './domain/workbook-adapter.types';
export type {
  WorkbookAdapter,
  WorkbookAdapterErrorCode,
  WorkbookCalculatedValue,
  WorkbookCellAddress,
  WorkbookCellInput,
} from './domain/workbook-adapter.types';
export type { SpreadsheetEditorProps, SpreadsheetExercise, SpreadsheetSnapshotController, WorkbookSeed } from './types/spreadsheet.types';
