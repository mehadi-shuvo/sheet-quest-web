import { expect, test, type Page } from '@playwright/test';

const spreadsheetCanvas = '[data-u-comp="render-canvas"][data-u-unit-id="formula-proof"]';

async function proof(page: Page) {
  const result = page.getByTestId('univer-proof-results');
  await expect(result).toBeVisible();
  return JSON.parse((await result.textContent()) ?? '') as {
    averageDisplayValue: string;
    averageNumericValue: number;
    formulas: Record<string, string>;
    initialValues: Record<string, unknown>;
    recalculatedValues: Record<string, unknown>;
    snapshotRestored: boolean;
  };
}

test.describe('Univer feasibility spike', () => {
  test('calculates formulas, supports real editing and round-trips snapshots', async ({ browser }) => {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:3002' });
    const page = await context.newPage();
    const browserErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/spikes/univer');
    const initial = await proof(page);
    expect(initial.initialValues).toMatchObject({ A3: 30, C2: 'Pass', F1: 40, G2: 20 });
    expect(initial.averageNumericValue).toBeCloseTo(13 / 3, 10);
    expect(initial.averageDisplayValue).toBe('4.33');
    expect(initial.formulas).toMatchObject({
      A3: '=SUM(A1:A2)',
      B4: '=AVERAGE(B1:B3)',
      C2: '=IF(C1>=40,"Pass","Fail")',
      F1: '=SUMIF(D1:D3,"A",E1:E3)',
      G2: '=G1*2',
    });
    expect(initial.recalculatedValues).toMatchObject({ G2: 30 });
    expect(initial.snapshotRestored).toBe(true);

    const canvas = page.locator(spreadsheetCanvas);
    const activeCell = page.locator('[data-u-comp="defined-name"] input');
    await canvas.click({ position: { x: 80, y: 55 } });
    await expect(activeCell).toHaveValue('A2');
    await page.keyboard.press('Control+C');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('20');

    await canvas.click({ position: { x: 780, y: 130 } });
    await expect(activeCell).toHaveValue('I5');
    await page.keyboard.press('Control+V');
    await page.keyboard.press('Control+C');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('20');

    await canvas.click({ position: { x: 870, y: 155 } });
    await expect(activeCell).toHaveValue('J6');
    await page.keyboard.type('=NOT_A_FUNCTION(');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await expect(activeCell).toHaveValue('J6');
    await expect
      .poll(async () => {
        await page.keyboard.press('Control+C');
        return page.evaluate(() => navigator.clipboard.readText());
      })
      .toBe('#NAME?');

    const box = await canvas.boundingBox();
    if (!box) throw new Error('Spreadsheet canvas did not have a bounding box.');
    await page.mouse.move(box.x + 80, box.y + 55);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 100, { steps: 3 });
    await page.mouse.up();
    await expect(activeCell).toHaveValue('A2:B4');
    await page.keyboard.press('Control+C');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('20\t5\n30\t4\n\t4.33');

    await canvas.click({ position: { x: 620, y: 35 } });
    await expect(activeCell).toHaveValue('G1');
    await page.keyboard.type('15');
    await page.keyboard.press('Enter');
    await expect(activeCell).toHaveValue('G2');
    await expect
      .poll(async () => {
        await page.keyboard.press('Control+C');
        return page.evaluate(() => navigator.clipboard.readText());
      })
      .toBe('30');

    await page.getByTestId('export-snapshot').click();
    await page.getByTestId('reset-workbook').click();
    expect((await proof(page)).initialValues).toMatchObject({ G2: 20 });
    await page.getByTestId('restore-snapshot').click();
    expect((await proof(page)).initialValues).toMatchObject({ G2: 30 });

    for (let index = 0; index < 3; index += 1) {
      await page.getByTestId('reset-workbook').click();
      await proof(page);
      await page.getByTestId('restore-snapshot').click();
      await proof(page);
    }

    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    expect(browserErrors).toEqual([]);
    expect(consoleErrors.filter((message) => message.includes('same unit id'))).toEqual([]);
    await context.close();
  });

  test('survives refresh and route unmount/remount without duplicate units', async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });

    await page.goto('/spikes/univer');
    await proof(page);
    await page.reload();
    await proof(page);
    await page.goto('/');
    await page.goto('/spikes/univer');
    await proof(page);

    expect(failures.filter((message) => /same unit id|UniverInstanceService/i.test(message))).toEqual([]);
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  });
});
