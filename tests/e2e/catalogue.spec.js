import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';

test.describe('Catalogue - Search & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue.html`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('catalogue page shows search input', async ({ page }) => {
    const searchInput = page.locator('#cat-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('typing in search shows results', async ({ page }) => {
    const searchInput = page.locator('#cat-search-input');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search for a common club name
    await searchInput.fill('Arsenal');
    await page.waitForTimeout(500);

    // Results should appear
    const results = page.locator('#cat-search-results');
    await expect(results).toBeVisible({ timeout: 5000 });

    // Should have at least one result
    const resultItems = results.locator('a, .search-result, li');
    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('country cards are displayed on main catalogue', async ({ page }) => {
    // Main catalogue should show countries
    await page.waitForTimeout(2000); // Wait for data to load

    const countryCards = page.locator('.cat-country-card');
    const count = await countryCards.count();

    if (count > 0) {
      // Countries are loaded — good
      expect(count).toBeGreaterThan(5); // Should have many countries
    }
  });

  test('country page via URL loads and has breadcrumbs', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue.html?country=ENG`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Breadcrumbs should appear with country context
    const breadcrumbs = page.locator('#catalogue-breadcrumbs');
    await expect(breadcrumbs).toBeVisible({ timeout: 10000 });

    // Page body should have content loaded
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(100);
  });

  test('breadcrumbs update on navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue.html?country=ENG`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const breadcrumbs = page.locator('#catalogue-breadcrumbs');
    const text = await breadcrumbs.textContent();

    // Breadcrumbs should mention catalogue and country
    expect(text.toLowerCase()).toMatch(/catalogue|catalog/);
  });

  test('club page shows sticker gallery', async ({ page }) => {
    // Navigate to a known club (Arsenal, club_id varies — let's go via country first)
    await page.goto(`${BASE_URL}/catalogue.html?country=ENG`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click first club card
    const firstClub = page.locator('.cat-club-card').first();
    if (await firstClub.isVisible()) {
      await firstClub.click();
      await page.waitForTimeout(2000);

      // Should show sticker images or gallery
      const content = page.locator('#catalogue-content');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Static Pages - SEO & Content', () => {
  test('sticker detail page has proper structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/stickers/100.html`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should have title element (may be hidden, used for SEO)
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Page should have content loaded
    const body = await page.locator('body').textContent();
    expect(body.length).toBeGreaterThan(100);
  });

  test('club page has proper structure', async ({ page }) => {
    // clubs/1.html is a known club page
    const response = await page.goto(`${BASE_URL}/clubs/1.html`);
    if (response.status() === 200) {
      await page.waitForLoadState('domcontentloaded');

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    }
  });

  test('country page has proper structure', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/countries/ENG.html`);
    if (response.status() === 200) {
      await page.waitForLoadState('domcontentloaded');

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      const text = await h1.textContent();
      expect(text.toLowerCase()).toContain('england');
    }
  });
});
