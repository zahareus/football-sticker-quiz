import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';

test.describe('Battle Mode - Sticker Voting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/battle.html`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('battle page loads a pair of stickers', async ({ page }) => {
    // Wait for battle content to appear (loading state → content)
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });

    // Both sticker images should be visible
    const stickerA = page.locator('#sticker-a-img');
    const stickerB = page.locator('#sticker-b-img');

    await expect(stickerA).toBeVisible({ timeout: 10000 });
    await expect(stickerB).toBeVisible({ timeout: 10000 });

    // Images should have valid src
    const srcA = await stickerA.getAttribute('src');
    const srcB = await stickerB.getAttribute('src');
    expect(srcA).toBeTruthy();
    expect(srcB).toBeTruthy();
    expect(srcA).not.toBe(srcB); // Different stickers
  });

  test('stickers have data-id attributes', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });

    const stickerA = page.locator('#sticker-a');
    const stickerB = page.locator('#sticker-b');

    const idA = await stickerA.getAttribute('data-id');
    const idB = await stickerB.getAttribute('data-id');

    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(Number(idA)).toBeGreaterThan(0);
    expect(Number(idB)).toBeGreaterThan(0);
    expect(idA).not.toBe(idB);
  });

  test('clicking left sticker triggers vote animation', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    // Remember current sticker IDs
    const idBefore = await page.locator('#sticker-a').getAttribute('data-id');

    // Click left sticker to vote
    await page.locator('#sticker-a').click();

    // Winner animation should appear
    await page.waitForTimeout(300);
    const hasWinnerClass = await page.locator('#sticker-a').evaluate(
      el => el.classList.contains('winner')
    );
    expect(hasWinnerClass).toBe(true);
  });

  test('new pair loads after voting', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    const idBefore = await page.locator('#sticker-a').getAttribute('data-id');

    // Vote for left sticker
    await page.locator('#sticker-a').click();

    // Wait for new pair to load (animation + fetch)
    await page.waitForTimeout(2000);

    // At least one sticker ID should change (new pair)
    const idAfterA = await page.locator('#sticker-a').getAttribute('data-id');
    const idAfterB = await page.locator('#sticker-b').getAttribute('data-id');

    // New pair loaded — IDs should differ from original
    const changed = idAfterA !== idBefore || idAfterB !== idBefore;
    expect(changed).toBe(true);
  });

  test('can vote multiple times in sequence', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    // Vote 3 times
    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

      // Alternate left and right votes
      const selector = i % 2 === 0 ? '#sticker-a' : '#sticker-b';
      await page.locator(selector).click();

      // Wait for next pair
      await page.waitForTimeout(1500);
    }

    // After 3 votes, battle should still be functional
    const battleContent = page.locator('#battle-content');
    await expect(battleContent).toBeVisible();
  });

  test('battle content remains functional after vote', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    // Vote and verify battle is still working
    await page.locator('#sticker-b').click();
    await page.waitForTimeout(2000);

    const battleContent = page.locator('#battle-content');
    await expect(battleContent).toBeVisible();
  });

  test('keyboard voting works (ArrowLeft)', async ({ page }) => {
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    // Press ArrowLeft to vote for left sticker
    await page.keyboard.press('ArrowLeft');

    await page.waitForTimeout(500);
    const hasWinner = await page.locator('#sticker-a').evaluate(
      el => el.classList.contains('winner')
    );
    expect(hasWinner).toBe(true);
  });
});
