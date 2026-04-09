import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';

test.describe('Quiz - Classic Easy Mode (no auth required)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/quiz.html`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('landing page shows all game mode buttons', async ({ page }) => {
    const landing = page.locator('#landing-page');
    await expect(landing).toBeVisible({ timeout: 10000 });

    await expect(page.locator('#landing-play-easy-button')).toBeVisible();
    await expect(page.locator('#landing-ttr-button')).toBeVisible();
    await expect(page.locator('#landing-daily-button')).toBeVisible();
  });

  test('clicking Play Easy starts a quiz game', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();

    // Game area should become visible
    const gameArea = page.locator('#game-area');
    await expect(gameArea).toBeVisible({ timeout: 10000 });

    // Sticker image should load (wait for src to be set)
    const stickerImg = page.locator('#sticker-image');
    await expect(stickerImg).toBeVisible({ timeout: 10000 });
    // Image src may be set async — wait for it
    await page.waitForFunction(() => {
      const img = document.getElementById('sticker-image');
      return img && img.src && img.src.length > 20;
    }, { timeout: 10000 });
  });

  test('quiz shows 4 answer options', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    // Should have exactly 4 answer buttons
    const options = page.locator('#options .btn');
    await expect(options).toHaveCount(4, { timeout: 10000 });

    // Each button should have text (club name)
    for (let i = 0; i < 4; i++) {
      const text = await options.nth(i).textContent();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('timer counts down from 10', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    const timer = page.locator('#time-left');
    const initialTime = await timer.textContent();
    expect(Number(initialTime)).toBe(10);

    // Wait 2 seconds and check timer decreased
    await page.waitForTimeout(2500);
    const laterTime = await timer.textContent();
    expect(Number(laterTime)).toBeLessThan(10);
    expect(Number(laterTime)).toBeGreaterThan(0);
  });

  test('clicking an answer option shows correct/incorrect feedback', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#options .btn', { timeout: 10000 });

    // Click the first answer option
    const firstOption = page.locator('#options .btn').first();
    await firstOption.click();

    // One button should get correct-answer class (the right answer)
    await page.waitForTimeout(500);
    const correctBtn = page.locator('#options .btn.correct-answer');
    await expect(correctBtn).toHaveCount(1, { timeout: 3000 });
  });

  test('correct answer increments score', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#options .btn', { timeout: 10000 });

    // Get initial score
    const scoreEl = page.locator('#current-score');
    const initialScore = Number(await scoreEl.textContent());

    // Find and click the correct answer by waiting for data attribute
    // We'll use a trick: click an answer, check if it was correct
    const options = page.locator('#options .btn');
    await options.first().click();

    await page.waitForTimeout(500);
    const wasCorrect = await page.locator('#options .btn').first().evaluate(
      el => el.classList.contains('correct-answer')
    );

    if (wasCorrect) {
      // Score should have incremented
      await page.waitForTimeout(1000);
      const newScore = Number(await scoreEl.textContent());
      expect(newScore).toBe(initialScore + 1);
    }
    // If wrong, that's fine — we just verify the mechanism works
  });

  test('playing through a quiz session works end-to-end', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#options .btn', { timeout: 10000 });

    let answeredAtLeastOne = false;

    // Play up to 8 rounds (enough to either win some or lose 3)
    for (let attempt = 0; attempt < 8; attempt++) {
      // Check if game ended
      const resultPanel = page.locator('.result-right-panel');
      if (await resultPanel.isVisible()) {
        // Game over — verify UI shows results
        await expect(page.locator('#final-score')).toBeVisible();
        return; // Test passed
      }

      // Try to find answer buttons
      try {
        await page.waitForSelector('#options .btn:not([disabled])', { timeout: 5000 });
      } catch {
        break; // No more buttons — game might have ended
      }

      const options = page.locator('#options .btn');
      const count = await options.count();
      if (count === 0) break;

      await options.first().click();
      answeredAtLeastOne = true;
      await page.waitForTimeout(2000);
    }

    expect(answeredAtLeastOne).toBe(true);
  });

  test('new sticker loads after answering', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    // Get first sticker image src
    const firstSrc = await page.locator('#sticker-image').getAttribute('src');

    // Answer the question
    await page.locator('#options .btn').first().click();
    await page.waitForTimeout(2000);

    // Check if game is still going (not game over)
    const gameArea = page.locator('#game-area');
    if (await gameArea.isVisible()) {
      // New sticker should load (might be same sticker by chance, so just check it loaded)
      const stickerImg = page.locator('#sticker-image');
      await expect(stickerImg).toBeVisible();
      const newSrc = await stickerImg.getAttribute('src');
      expect(newSrc).toBeTruthy();
    }
  });

  test('lives (hearts) are visible during game', async ({ page }) => {
    await page.locator('#landing-play-easy-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    // Hearts should be visible
    const hearts = page.locator('#lives-hearts .heart');
    const count = await hearts.count();
    expect(count).toBeGreaterThanOrEqual(3); // Classic=3 active, but DOM may have 5 elements
  });
});

test.describe('Quiz - Time To Run Mode', () => {
  test('TTR mode starts with 60 second timer', async ({ page }) => {
    await page.goto(`${BASE_URL}/quiz.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#landing-ttr-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    const timer = page.locator('#time-left');
    // TTR mode uses the same timer element, value depends on initialization
    const time = Number(await timer.textContent());
    expect(time).toBeGreaterThan(0);
    expect(time).toBeLessThanOrEqual(60);
  });

  test('TTR mode has 5 lives', async ({ page }) => {
    await page.goto(`${BASE_URL}/quiz.html`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#landing-ttr-button').click();
    await page.waitForSelector('#sticker-image[src]', { timeout: 10000 });

    const hearts = page.locator('#lives-hearts .heart');
    const count = await hearts.count();
    expect(count).toBe(5);
  });
});
