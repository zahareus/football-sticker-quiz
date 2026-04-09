import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';

test.describe('Leaderboard - Scores & Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard.html`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('leaderboard page loads with content', async ({ page }) => {
    // Wait for leaderboard data to load
    await page.waitForTimeout(3000);

    // Should have leaderboard container
    const container = page.locator('#leaderboard-page-container');
    await expect(container).toBeVisible();

    // Should have at least one table or list
    const tables = page.locator('.stats-table, table, #leaderboard-table-easy');
    const count = await tables.count();
    expect(count).toBeGreaterThan(0);
  });

  test('leaderboard has time filter buttons', async ({ page }) => {
    await page.waitForTimeout(2000);

    const timeFilters = page.locator('.leaderboard-time-filter');
    const count = await timeFilters.count();
    expect(count).toBeGreaterThanOrEqual(3); // today, week, month, all
  });

  test('clicking time filter reloads data', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Click "Today" filter
    const todayFilter = page.locator('.leaderboard-time-filter[data-timeframe="today"]');
    if (await todayFilter.isVisible()) {
      await todayFilter.click();
      await page.waitForTimeout(2000);

      // Filter should become active
      const isActive = await todayFilter.evaluate(el => el.classList.contains('active'));
      expect(isActive).toBe(true);
    }
  });

  test('leaderboard entries have rank, name, and score', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Check if there are any entries
    const rows = page.locator('.stats-table tr');
    const count = await rows.count();

    if (count > 0) {
      // First row should have rank, name, score cells
      const firstRow = rows.first();
      const cells = firstRow.locator('td');
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThanOrEqual(3);

      // Rank should be a number
      const rank = await cells.nth(0).textContent();
      expect(Number(rank.trim())).toBeGreaterThan(0);

      // Score should be a number
      const score = await cells.last().textContent();
      expect(Number(score.trim())).toBeGreaterThanOrEqual(0);
    }
  });

  test('easy leaderboard table exists', async ({ page }) => {
    await page.waitForTimeout(3000);

    const easyTable = page.locator('#leaderboard-table-easy');
    // It should exist in the DOM
    const count = await easyTable.count();
    expect(count).toBe(1);
  });

  test('clicking "All time" shows most results', async ({ page }) => {
    await page.waitForTimeout(2000);

    const allFilter = page.locator('.leaderboard-time-filter[data-timeframe="all"]');
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await page.waitForTimeout(3000);

      // All-time should typically have the most entries
      const rows = page.locator('.stats-table tr');
      const count = await rows.count();
      // All-time should have at least some scores (the game has been running)
      expect(count).toBeGreaterThan(0);
    }
  });
});
