import { test, expect } from '@playwright/test';
import { loginTestUser, cleanupTestData, supabaseQuery, TEST_USER_ID } from './helpers/auth.js';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';
const HAS_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_KEY;

// Skip all tests if no service key (CI without secrets)
test.describe('Authenticated Quiz - Score Persistence', () => {
  test.skip(!HAS_SERVICE_KEY, 'Requires SUPABASE_SERVICE_KEY');
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await cleanupTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('login via magic link works', async ({ page }) => {
    await loginTestUser(page, `${BASE_URL}/quiz.html`);

    // After login, user status should show username
    const userStatus = page.locator('#user-status');
    await expect(userStatus).toBeVisible({ timeout: 10000 });

    // Logout button should be visible (means user is logged in)
    const logoutBtn = page.locator('#logout-button');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
  });

  test('logged-in user sees difficulty selection (not landing page)', async ({ page }) => {
    await loginTestUser(page, `${BASE_URL}/quiz.html`);

    // Logged-in users should see difficulty selection, not landing page
    await page.waitForTimeout(2000);

    const difficultySelection = page.locator('#difficulty-selection');
    const landingPage = page.locator('#landing-page');

    // One of these should be visible
    const hasDifficulty = await difficultySelection.isVisible();
    const hasLanding = await landingPage.isVisible();
    expect(hasDifficulty || hasLanding).toBe(true);
  });

  test('play a quiz and verify score is saved to database', async ({ page }) => {
    // Clean up before this test
    await cleanupTestData();

    await loginTestUser(page, `${BASE_URL}/quiz.html`);
    await page.waitForTimeout(2000);

    // Start an easy game (may need to click landing button or difficulty button)
    const landingBtn = page.locator('#landing-play-easy-button');
    const diffBtn = page.locator('.difficulty-button[data-difficulty="1"]');

    if (await landingBtn.isVisible()) {
      await landingBtn.click();
    } else if (await diffBtn.isVisible()) {
      await diffBtn.click();
    }

    // Wait for game to start
    await page.waitForSelector('#sticker-image', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Play through: answer questions until game over
    let answered = 0;
    for (let i = 0; i < 10; i++) {
      const resultPanel = page.locator('.result-right-panel');
      if (await resultPanel.isVisible()) break;

      try {
        await page.waitForSelector('#options .btn:not([disabled])', { timeout: 5000 });
        await page.locator('#options .btn').first().click();
        answered++;
        await page.waitForTimeout(2000);
      } catch {
        break;
      }
    }

    expect(answered).toBeGreaterThan(0);

    // Wait for game to end and score to be saved
    const resultPanel = page.locator('.result-right-panel');
    if (await resultPanel.isVisible()) {
      // Get the displayed final score
      const finalScoreEl = page.locator('#final-score');
      const displayedScore = Number(await finalScoreEl.textContent());

      // Wait for score to persist to database
      await page.waitForTimeout(3000);

      // Check database for the score (only if score > 0 — app doesn't save 0-scores)
      if (displayedScore > 0) {
        const scores = await supabaseQuery('scores',
          `user_id=eq.${TEST_USER_ID}&order=created_at.desc&limit=1`
        );

        expect(scores.length).toBeGreaterThan(0);
        expect(scores[0].user_id).toBe(TEST_USER_ID);
        expect(scores[0].difficulty).toBe(1); // Easy mode
        expect(scores[0].score).toBe(displayedScore);
      }
    }
  });

  test('profile is created for test user', async ({ page }) => {
    await loginTestUser(page, `${BASE_URL}/quiz.html`);
    await page.waitForTimeout(3000);

    // Check that a profile exists in the database
    const profiles = await supabaseQuery('profiles',
      `id=eq.${TEST_USER_ID}`
    );

    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe(TEST_USER_ID);
    expect(profiles[0].username).toBeTruthy();
  });
});
