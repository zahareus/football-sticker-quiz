import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// Load .env from tests/e2e/ for local runs
config({ path: './tests/e2e/.env' });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  workers: 3,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
