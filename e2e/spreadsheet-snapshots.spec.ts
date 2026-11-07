import { expect, test, type Page } from '@playwright/test';

const canvasSelector = '[data-u-comp="render-canvas"][data-u-unit-id="snapshot-round-trip-workbook"]';

async function ready(page: Page) {
  await expect(page.getByTestId('spreadsheet-editor-ready')).toBeVisible();
}

async function selectCell(page: Page, address: string) {
  const input = page.locator('[data-u-comp="defined-name"] input');
  await input.fill(address);
  await input.press('Enter');
  await expect(input).toHaveValue(address);
}

async function setCell(page: Page, address: string, value: string) {
  await selectCell(page, address);
  const canvas = page.locator(canvasSelector);
  await canvas.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

async function expectDisplay(page: Page, address: string, value: string) {
  await selectCell(page, address);
  await expect.poll(async () => {
    await page.keyboard.press('Control+C');
    return page.evaluate(() => navigator.clipboard.readText());
  }).toBe(value);
}

async function expectFormula(page: Page, address: string, formula: string) {
  await selectCell(page, address);
  await page.locator(canvasSelector).press('F2');
  try {
    await expect.poll(async () => {
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Control+C');
      return page.evaluate(() => navigator.clipboard.readText());
    }).toBe(formula);
  } finally {
    await page.keyboard.press('Escape');
  }
}

test('round trips canonical workbook JSON through the real Univer editor', async ({ browser }) => {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => void dialog.accept());

  await page.goto('/practice/snapshots');
  await ready(page);
  await setCell(page, 'B1', '15');
  await expectDisplay(page, 'C1', '30.00');

  await page.getByTestId('export-canonical-workbook').click();
  const jsonArea = page.getByTestId('canonical-workbook-json');
  await expect.poll(() => jsonArea.inputValue()).not.toBe('');
  const exported = await jsonArea.inputValue();
  const parsed = JSON.parse(exported) as {
    schemaVersion: number;
    sheets: Array<{ cells: Record<string, unknown>; name: string; [key: string]: unknown }>;
  };
  expect(parsed.schemaVersion).toBe(1);
  expect(parsed.sheets.map((sheet) => sheet.name)).toEqual(['Summary', 'Inputs']);

  const importStartedAt = performance.now();
  for (let importCount = 0; importCount < 2; importCount += 1) {
    await jsonArea.fill(exported);
    await page.getByTestId('import-canonical-workbook').click();
    await expect(page.getByTestId('spreadsheet-editor-host')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByTestId('spreadsheet-editor-host')).toHaveAttribute('aria-busy', 'false');
  }
  const importDurationMs = Math.round(performance.now() - importStartedAt);
  await expectDisplay(page, 'B1', '15');
  await expectDisplay(page, 'C1', '30.00');
  await expectFormula(page, 'C1', '=B1*2');

  await setCell(page, 'B1', '20');
  await expectDisplay(page, 'C1', '40.00');
  for (const [invalidJson, expectedError] of [
    ['{', 'valid JSON'],
    ['{"schemaVersion":2}', 'schemaVersion'],
    [JSON.stringify({ ...parsed, sheets: [{ ...parsed.sheets[0], cells: { A0: { value: 1 } } }] }), 'supported cell address'],
    ['x'.repeat(1_000_001), 'exceeds'],
  ]) {
    await jsonArea.fill(invalidJson);
    await page.getByTestId('import-canonical-workbook').click();
    await expect(page.getByTestId('snapshot-operation-status')).toContainText(expectedError);
    await expect(page.getByTestId('spreadsheet-editor-host')).toHaveAttribute('aria-busy', 'false');
    await expectDisplay(page, 'B1', '20');
  }

  await page.getByTestId('reset-practice-workbook').click();
  await ready(page);
  await expectDisplay(page, 'B1', '10');
  await page.reload();
  await ready(page);
  console.log(`snapshot performance: ${JSON.stringify({ bytes: new TextEncoder().encode(exported).byteLength, importDurationMs })}`);
  expect(errors).toEqual([]);
  await context.close();
});
