import { test, expect } from '@playwright/test';
import { supabaseQuery } from './helpers/auth.js';

const BASE_URL = process.env.BASE_URL || 'https://stickerhunt.club';
const HAS_SERVICE_KEY = !!process.env.SUPABASE_SERVICE_KEY;

test.describe('Battle - Database Integration', () => {
  test.skip(!HAS_SERVICE_KEY, 'Requires SUPABASE_SERVICE_KEY');
  test.describe.configure({ mode: 'serial' });

  test('voting creates a record in votes table with ELO changes', async ({ page }) => {
    // Get vote count before
    const countBefore = await supabaseQuery('votes', 'select=id&order=id.desc&limit=1');
    const maxIdBefore = countBefore.length ? countBefore[0].id : 0;

    // Open battle page and vote
    await page.goto(`${BASE_URL}/battle.html`);
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    // Vote for sticker A
    await page.locator('#sticker-a').click();
    await page.waitForTimeout(3000); // Wait for DB write

    // Find new votes since our test started
    const newVotes = await supabaseQuery('votes',
      `select=*&id=gt.${maxIdBefore}&order=id.desc&limit=5`
    );

    // At least one new vote should exist
    expect(newVotes.length).toBeGreaterThan(0);

    // Find a vote with valid ELO data
    const voteWithElo = newVotes.find(v =>
      v.rating_a_before > 0 && v.rating_b_before > 0
    );
    expect(voteWithElo).toBeDefined();

    // ELO changes should be consistent: winner gains, loser loses
    expect(voteWithElo.rating_a_after).not.toBe(voteWithElo.rating_a_before);
    expect(voteWithElo.rating_b_after).not.toBe(voteWithElo.rating_b_before);
    expect(voteWithElo.winner_id).toBeTruthy();
    expect(voteWithElo.loser_id).toBeTruthy();
  });

  test('sticker ratings update in stickers table after vote', async ({ page }) => {
    await page.goto(`${BASE_URL}/battle.html`);
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-a-img[src]', { timeout: 10000 });

    const stickerAId = Number(await page.locator('#sticker-a').getAttribute('data-id'));

    // Get sticker's rating and games count before vote
    const before = await supabaseQuery('stickers',
      `select=rating,games,wins&id=eq.${stickerAId}`
    );
    const ratingBefore = before[0].rating;
    const gamesBefore = before[0].games;
    const winsBefore = before[0].wins;

    // Vote for sticker A (it wins)
    await page.locator('#sticker-a').click();
    await page.waitForTimeout(3000);

    // Check sticker's updated stats
    const after = await supabaseQuery('stickers',
      `select=rating,games,wins&id=eq.${stickerAId}`
    );

    expect(after[0].games).toBe(gamesBefore + 1);
    expect(after[0].wins).toBe(winsBefore + 1);
    expect(after[0].rating).toBeGreaterThan(ratingBefore); // Winner's rating increased
  });

  test('losing sticker rating decreases', async ({ page }) => {
    await page.goto(`${BASE_URL}/battle.html`);
    await page.waitForSelector('#battle-content', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('#sticker-b-img[src]', { timeout: 10000 });

    const stickerBId = Number(await page.locator('#sticker-b').getAttribute('data-id'));

    // Get sticker B's rating before (it will lose)
    const before = await supabaseQuery('stickers',
      `select=rating,games,losses&id=eq.${stickerBId}`
    );
    const ratingBefore = before[0].rating;
    const lossesBefore = before[0].losses;

    // Vote for sticker A (sticker B loses)
    await page.locator('#sticker-a').click();
    await page.waitForTimeout(3000);

    const after = await supabaseQuery('stickers',
      `select=rating,games,losses&id=eq.${stickerBId}`
    );

    expect(after[0].losses).toBe(lossesBefore + 1);
    expect(after[0].rating).toBeLessThan(ratingBefore); // Loser's rating decreased
  });
});
