import { expect, test, type Page } from '@playwright/test';
import { formulaTestFixture } from '../src/features/spreadsheet/fixtures/formula-test-cases';

const spreadsheetCanvas = '[data-u-comp="render-canvas"][data-u-unit-id="formula-compatibility-workbook"]';

function formulaCase(id: string) {
  const testCase = formulaTestFixture.cases.find((candidate) => candidate.id === id);
  if (!testCase) throw new Error(`Missing formula fixture case: ${id}`);
  return testCase;
}

async function editorReady(page: Page) {
  await expect(page.getByTestId('spreadsheet-editor-ready')).toBeVisible();
  return page.locator(spreadsheetCanvas);
}

async function selectCell(page: Page, address: string) {
  const activeCell = page.locator('[data-u-comp="defined-name"] input');
  await activeCell.fill(address);
  await activeCell.press('Enter');
  await expect(activeCell).toHaveValue(address);
}

async function expectCellDisplay(page: Page, address: string, expected: string) {
  await selectCell(page, address);
  await expect
    .poll(
      async () => {
        await page.keyboard.press('Control+C');
        return page.evaluate(() => navigator.clipboard.readText());
      },
      { message: `Expected ${address} to display ${expected}` }
    )
    .toBe(expected);
}

async function expectRawFormula(page: Page, address: string, expected: string) {
  await selectCell(page, address);
  const canvas = page.locator(spreadsheetCanvas);
  await canvas.press('F2');
  try {
    await expect
      .poll(
        async () => {
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Control+C');
          return page.evaluate(() => navigator.clipboard.readText());
        },
        { message: `Expected ${address} to preserve ${expected}` }
      )
      .toBe(expected);
  } finally {
    await page.keyboard.press('Escape');
  }
}

async function setCell(page: Page, address: string, value: string) {
  await selectCell(page, address);
  const canvas = page.locator(spreadsheetCanvas);
  await canvas.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

async function copyCell(page: Page, source: string, target: string, expectedClipboard: string) {
  await selectCell(page, source);
  await expect
    .poll(async () => {
      await page.keyboard.press('Control+C');
      return page.evaluate(() => navigator.clipboard.readText());
    })
    .toBe(expectedClipboard);
  await selectCell(page, target);
  await page.keyboard.press('Control+V');
}

test.describe('spreadsheet formula compatibility', () => {
  test('calculates the MVP formula set, recalculates dependencies, and resets formula data', async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('dialog', (dialog) => void dialog.accept());

    await page.goto('/practice/formulas');
    await editorReady(page);

    for (const id of ['sum', 'if', 'sumif', 'reference', 'nested', 'blank-cell', 'negative-decimal']) {
      const testCase = formulaCase(id);
      await expectCellDisplay(page, testCase.formulaCell, String(testCase.expected.result));
      await expectRawFormula(page, testCase.formulaCell, testCase.formula);
    }

    const averageDisplay = formulaCase('average-display');
    await expectCellDisplay(page, averageDisplay.formulaCell, averageDisplay.expected.display ?? '');
    await expectRawFormula(page, averageDisplay.formulaCell, averageDisplay.formula);
    await expectCellDisplay(page, formulaCase('average-raw').formulaCell, '4.33333333333');

    const casesWithRecalculation = ['if', 'sumif', 'reference', 'nested'].map(formulaCase);
    for (const testCase of casesWithRecalculation) {
      if (!testCase.recalculation) throw new Error(`Missing recalculation data for ${testCase.id}`);
      for (const [address, value] of Object.entries(testCase.recalculation.cells)) await setCell(page, address, String(value));
      await expectCellDisplay(page, testCase.formulaCell, String(testCase.recalculation.expected.result));
    }

    await page.getByTestId('reset-practice-workbook').click();
    const editorHost = page.getByTestId('spreadsheet-editor-host');
    await expect(editorHost).toHaveAttribute('aria-busy', 'true');
    await expect(editorHost).toHaveAttribute('aria-busy', 'false');
    for (const id of ['if', 'sumif', 'reference', 'nested']) {
      const testCase = formulaCase(id);
      await expectCellDisplay(page, testCase.formulaCell, String(testCase.expected.result));
    }

    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    await context.close();
  });

  test('preserves raw formulas and translates relative, absolute, and mixed references on copy/paste', async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
    const page = await context.newPage();

    await page.goto('/practice/formulas');
    await editorReady(page);

    const relative = formulaCase('relative-reference-source');
    await expectRawFormula(page, relative.formulaCell, relative.formula);
    await copyCell(page, 'N1', 'N2', '20');
    await expectRawFormula(page, 'N2', '=M2*2');
    await expectCellDisplay(page, 'N2', '40');

    await setCell(page, 'O1', '=$M$1*2');
    await copyCell(page, 'O1', 'O2', '20');
    await expectRawFormula(page, 'O2', '=$M$1*2');
    await expectCellDisplay(page, 'O2', '20');

    await setCell(page, 'P1', '=$M1*2');
    await copyCell(page, 'P1', 'P2', '20');
    await expectRawFormula(page, 'P2', '=$M2*2');
    await expectCellDisplay(page, 'P2', '40');

    await setCell(page, 'Q1', '=M$1*2');
    await copyCell(page, 'Q1', 'Q2', '20');
    await expectRawFormula(page, 'Q2', '=M$1*2');
    await expectCellDisplay(page, 'Q2', '20');

    await context.close();
  });

  test('reports observed formula errors and remains responsive after circular references', async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/practice/formulas');
    await editorReady(page);

    for (const id of ['unknown-function', 'division-by-zero', 'malformed-formula', 'circular-reference']) {
      const testCase = formulaCase(id);
      await expectCellDisplay(page, testCase.formulaCell, String(testCase.expected.result));
      await expectRawFormula(page, testCase.formulaCell, testCase.formula);
    }

    await setCell(page, 'R1', '=#REF!');
    await expectRawFormula(page, 'R1', '=#REF!');
    await expectCellDisplay(page, 'R1', '#REF!');

    await setCell(page, 'G1', '15');
    await expectCellDisplay(page, formulaCase('reference').formulaCell, '30');
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((message) => /same unit id|UniverInstanceService/i.test(message))).toEqual([]);
    await context.close();
  });
});
