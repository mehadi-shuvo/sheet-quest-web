import type { FWorkbook } from '@univerjs/preset-sheets-core';
import type { createSpreadsheetUniver } from './create-univer';
import type { WorkbookSeed } from '../../types/spreadsheet.types';

type UniverApi = ReturnType<typeof createSpreadsheetUniver>['univerAPI'];
type UniverInstance = ReturnType<typeof createSpreadsheetUniver>['univer'];
type WorkbookSnapshot = ReturnType<FWorkbook['save']>;

export type SpreadsheetRuntime = {
  disposed: boolean;
  initialSnapshot: WorkbookSnapshot;
  operationVersion: number;
  univer: UniverInstance;
  univerAPI: UniverApi;
  workbook: FWorkbook;
};

const FORMULA_READY_TIMEOUT_MS = 5_000;
const RENDER_READY_TIMEOUT_MS = 5_000;

export function cloneWorkbookSeed(seed: WorkbookSeed): WorkbookSeed {
  return JSON.parse(JSON.stringify(seed)) as WorkbookSeed;
}

export function workbookSeedHasFormulas(seed: WorkbookSeed): boolean {
  return Object.values(seed.sheets).some((sheet) =>
    Object.values(sheet.cellData ?? {}).some((row) => Object.values(row).some((cell) => Boolean(cell.f)))
  );
}

function cloneSnapshot(snapshot: WorkbookSnapshot): WorkbookSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkbookSnapshot;
}

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

export function createSpreadsheetRuntime(
  univer: UniverInstance,
  univerAPI: UniverApi,
  initialWorkbook: WorkbookSeed
): SpreadsheetRuntime {
  const workbook = univerAPI.createWorkbook(cloneWorkbookSeed(initialWorkbook));

  return {
    disposed: false,
    initialSnapshot: cloneSnapshot(workbook.save()),
    operationVersion: 0,
    univer,
    univerAPI,
    workbook,
  };
}

export async function waitForRendered(runtime: SpreadsheetRuntime, operationVersion: number): Promise<boolean> {
  const deadline = window.performance.now() + RENDER_READY_TIMEOUT_MS;
  while (
    !runtime.disposed &&
    runtime.operationVersion === operationVersion &&
    runtime.univerAPI.getCurrentLifecycleStage() < runtime.univerAPI.Enum.LifecycleStages.Rendered
  ) {
    if (window.performance.now() >= deadline) {
      throw new Error(`Univer did not reach the Rendered lifecycle stage within ${RENDER_READY_TIMEOUT_MS}ms.`);
    }
    await nextFrame();
  }

  return !runtime.disposed && runtime.operationVersion === operationVersion;
}

export async function waitForFormulaCalculation(
  runtime: SpreadsheetRuntime,
  workbook: FWorkbook,
  operationVersion: number
): Promise<boolean> {
  if (!(await waitForRendered(runtime, operationVersion))) return false;

  const formula = runtime.univerAPI.getFormula();
  formula.executeCalculation();
  await formula.onCalculationResultApplied(FORMULA_READY_TIMEOUT_MS);

  return !runtime.disposed && runtime.workbook === workbook && runtime.operationVersion === operationVersion;
}

export function replaceWorkbook(runtime: SpreadsheetRuntime, snapshot: WorkbookSnapshot): FWorkbook {
  const previousId = runtime.workbook.getId();
  if (!runtime.univerAPI.disposeUnit(previousId)) {
    throw new Error('The current workbook could not be disposed before replacement.');
  }

  runtime.workbook = runtime.univerAPI.createWorkbook(cloneSnapshot(snapshot));
  return runtime.workbook;
}

export function replaceWorkbookSeed(runtime: SpreadsheetRuntime, seed: WorkbookSeed): FWorkbook {
  const previousSnapshot = cloneSnapshot(runtime.workbook.save());
  const previousId = runtime.workbook.getId();
  if (!runtime.univerAPI.disposeUnit(previousId)) {
    throw new Error('The current workbook could not be disposed before import.');
  }

  try {
    runtime.workbook = runtime.univerAPI.createWorkbook(cloneWorkbookSeed(seed));
    return runtime.workbook;
  } catch (error) {
    try {
      runtime.workbook = runtime.univerAPI.createWorkbook(previousSnapshot);
    } catch {
      throw new Error('The import failed and the previous workbook could not be restored.');
    }
    throw error;
  }
}

export function disposeSpreadsheetRuntime(runtime: SpreadsheetRuntime) {
  runtime.disposed = true;
  runtime.univer.dispose();
}
