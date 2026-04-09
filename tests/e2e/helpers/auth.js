// Test authentication helper
// Generates a magic link via Supabase Admin API and logs in via Playwright

const SUPABASE_URL = 'https://rbmeslzlbsolkxnvesqb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TEST_EMAIL = 'test-automation@stickerhunt.club';
const TEST_USER_ID = '221494ca-8a2b-4a6d-9625-78dda9be74a1';

export { TEST_EMAIL, TEST_USER_ID, SUPABASE_URL };

/**
 * Generate a fresh magic link for the test user via Admin API
 * Returns the action_link URL that auto-logs in when visited
 */
export async function generateMagicLink() {
  if (!SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY env var required for auth tests');
  }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: TEST_EMAIL,
    }),
  });

  const data = await resp.json();
  if (!data.action_link) {
    throw new Error(`Failed to generate magic link: ${JSON.stringify(data)}`);
  }

  return data.action_link;
}

/**
 * Log in the test user in a Playwright page
 * Visits the magic link, waits for redirect, then navigates to target URL
 */
export async function loginTestUser(page, targetUrl) {
  const magicLink = await generateMagicLink();

  // Visit magic link — Supabase will verify and redirect to stickerhunt.club
  await page.goto(magicLink);

  // Wait for redirect to complete (Supabase redirects to the app)
  await page.waitForURL('**/stickerhunt.club/**', { timeout: 15000 });

  // Wait for auth state to settle
  await page.waitForTimeout(2000);

  // Navigate to target page if different
  if (targetUrl) {
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }
}

/**
 * Clean up test data from Supabase (scores, profile changes)
 * Uses service role key to bypass RLS
 */
export async function cleanupTestData() {
  if (!SERVICE_KEY) return;

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Delete test user's scores
  await fetch(
    `${SUPABASE_URL}/rest/v1/scores?user_id=eq.${TEST_USER_ID}`,
    { method: 'DELETE', headers }
  );

  // Reset test user's profile (keep the account but clean stats)
  await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${TEST_USER_ID}`,
    {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ username: 'TestBot' }),
    }
  );
}

/**
 * Query Supabase directly (for assertions)
 */
export async function supabaseQuery(table, query) {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY required');

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  return resp.json();
}
