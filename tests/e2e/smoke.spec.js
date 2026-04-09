import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';

test.describe('StickerHunt Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/StickerHunt|Sticker/i);
  });

  test('homepage has play button or quiz link', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const playLink = page.locator('a[href*="quiz"], a[href*="play"], .play-btn, .hero-cta, button:has-text("Play")').first();
    await expect(playLink).toBeVisible({ timeout: 10000 });
  });

  test('quiz page loads with landing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/quiz.html`);
    await page.waitForLoadState('domcontentloaded');

    // Quiz shows landing-page with mode buttons first
    const landingPage = page.locator('#landing-page, #difficulty-selection').first();
    await expect(landingPage).toBeVisible({ timeout: 10000 });
  });

  test('battle page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/battle.html`);
    await page.waitForLoadState('domcontentloaded');

    const battleArea = page.locator('#battle-content, #battle-loading, .battle-container').first();
    await expect(battleArea).toBeVisible({ timeout: 10000 });
  });

  test('catalogue page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue.html`);
    await page.waitForLoadState('domcontentloaded');

    const catalogue = page.locator('#catalogue-container, #catalogue-content').first();
    await expect(catalogue).toBeVisible({ timeout: 10000 });
  });

  test('leaderboard page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/leaderboard.html`);
    await page.waitForLoadState('domcontentloaded');

    const leaderboard = page.locator('#leaderboard-page-container, #leaderboard-filters').first();
    await expect(leaderboard).toBeVisible({ timeout: 10000 });
  });

  test('static sticker page loads (sticker 100)', async ({ page }) => {
    await page.goto(`${BASE_URL}/stickers/100.html`);
    await page.waitForLoadState('domcontentloaded');

    // Page should return 200 and have content
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('ERR_BLOCKED') &&
      !e.includes('posthog') &&
      !e.includes('analytics') &&
      !e.includes('google')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('CSS and JS resources load on quiz page', async ({ page }) => {
    const failedResources = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css')) {
          failedResources.push(`${url}: ${response.status()}`);
        }
      }
    });

    await page.goto(`${BASE_URL}/quiz.html`);
    await page.waitForLoadState('networkidle');

    expect(failedResources).toEqual([]);
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
  });
});
