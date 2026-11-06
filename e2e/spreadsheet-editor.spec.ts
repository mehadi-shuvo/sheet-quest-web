import { expect, test, type Page } from '@playwright/test';

const spreadsheetCanvas = '[data-u-comp="render-canvas"][data-u-unit-id="employee-bonus-workbook"]';

async function editorReady(page: Page) {
  await expect(page.getByTestId('spreadsheet-editor-ready')).toBeVisible();
  return page.locator(spreadsheetCanvas);
}

async function copySelectedCell(page: Page) {
  await page.keyboard.press('Control+C');
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe('reusable spreadsheet editor', () => {
  test('supports employee-bonus editing, formulas, clipboard, and repeated reset', async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('dialog', (dialog) => void dialog.accept());

    await page.goto('/practice/demo');
    await expect(page.getByRole('heading', { name: 'Employee bonus calculation' })).toBeVisible();
    await expect(page.getByText('In cell C2, enter a formula')).toBeVisible();

    const canvas = await editorReady(page);
    const activeCell = page.locator('[data-u-comp="defined-name"] input');

    await canvas.click({ position: { x: 80, y: 55 } });
    await expect(activeCell).toHaveValue('A2');
    await expect.poll(() => copySelectedCell(page)).toBe('Rahim');

    await canvas.click({ position: { x: 260, y: 55 } });
    await expect(activeCell).toHaveValue('C2');
    await page.keyboard.type('=B2*10%');
    await page.keyboard.press('Enter');
    await expect(activeCell).toHaveValue('C3');
    await page.keyboard.press('ArrowUp');
    await expect(activeCell).toHaveValue('C2');
    await expect.poll(() => copySelectedCell(page)).toBe('5000');

    await canvas.click({ position: { x: 260, y: 80 } });
    await expect(activeCell).toHaveValue('C3');
    await page.keyboard.type('4000');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await expect(activeCell).toHaveValue('C3');
    await expect.poll(() => copySelectedCell(page)).toBe('4000');

    await canvas.click({ position: { x: 180, y: 55 } });
    await expect(activeCell).toHaveValue('B2');
    await expect.poll(() => copySelectedCell(page)).toBe('50000');
    await canvas.click({ position: { x: 780, y: 130 } });
    await page.keyboard.press('Control+V');
    await expect.poll(() => copySelectedCell(page)).toBe('50000');

    const box = await canvas.boundingBox();
    if (!box) throw new Error('Spreadsheet canvas did not have a bounding box.');
    await page.mouse.move(box.x + 80, box.y + 35);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 55, { steps: 3 });
    await page.mouse.up();
    await expect(activeCell).toHaveValue('A1:B2');
    await expect.poll(() => copySelectedCell(page)).toBe('Employee\tSalary\nRahim\t50000');

    for (let index = 0; index < 3; index += 1) {
      await page.getByTestId('reset-practice-workbook').click();
      await editorReady(page);
    }

    await canvas.click({ position: { x: 260, y: 55 } });
    await expect(activeCell).toHaveValue('C2');
    await expect.poll(() => copySelectedCell(page)).toBe('');
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((message) => /same unit id|UniverInstanceService/i.test(message))).toEqual([]);
    await context.close();
  });

  test('survives refresh and navigation without an infinite loading state', async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });

    await page.goto('/practice/demo');
    await editorReady(page);
    await page.reload();
    await editorReady(page);
    await page.goto('/');
    await page.goto('/practice/demo');
    await editorReady(page);

    await expect(page.getByTestId('spreadsheet-editor-loading')).toHaveCount(0);
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(failures.filter((message) => /same unit id|UniverInstanceService/i.test(message))).toEqual([]);
  });
});
