import { expect, test } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';

loadEnv({ path: './tests/e2e/.env' });

const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://local.stickerhunt.test';
const SUPABASE_URL = 'https://rbmeslzlbsolkxnvesqb.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PROJECT_ROOT = process.cwd();
const CLUB_PAGE_URL = `${LOCAL_BASE_URL}/clubs/395.html`;
const COUNTRY_PAGE_URL = `${LOCAL_BASE_URL}/countries/ESP.html`;
const CITY_PAGE_URL = `${LOCAL_BASE_URL}/cities/madrid.html`;
const STICKER_PAGE_URL = `${LOCAL_BASE_URL}/stickers/3406.html`;
const QUIZ_PAGE_URL = `${LOCAL_BASE_URL}/quiz.html`;
const BATTLE_PAGE_URL = `${LOCAL_BASE_URL}/battle.html`;
const CLUB_STICKER_ID = 20;

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html':
            return 'text/html; charset=utf-8';
        case '.js':
            return 'application/javascript; charset=utf-8';
        case '.css':
            return 'text/css; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.svg':
            return 'image/svg+xml';
        case '.ico':
            return 'image/x-icon';
        case '.xml':
            return 'application/xml; charset=utf-8';
        case '.txt':
            return 'text/plain; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

async function getViewCount(page, stickerId) {
    if (!SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_KEY env var required for the view-count e2e test');
    }

    return page.evaluate(async ({ stickerId, supabaseUrl, serviceKey }) => {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/stickers?id=eq.${stickerId}&select=id,view_count`,
            {
                headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to query view count: ${response.status}`);
        }

        const rows = await response.json();
        return rows[0]?.view_count ?? null;
    }, {
        stickerId,
        supabaseUrl: SUPABASE_URL,
        serviceKey: SERVICE_KEY
    });
}

async function waitForTrackedImage(page, selector) {
    const image = page.locator(selector);
    await expect(image).toBeVisible();
    await image.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.evaluate(() => window.StickerViewTracker?.flushPending());
}

test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
        window.__STICKERHUNT_ALLOW_VIEW_TRACKING__ = true;
    });

    await context.route(`${LOCAL_BASE_URL}/**`, async route => {
        const requestUrl = new URL(route.request().url());
        const relativePath = requestUrl.pathname === '/'
            ? 'index.html'
            : requestUrl.pathname.replace(/^\/+/, '');
        const resolvedPath = path.resolve(PROJECT_ROOT, decodeURIComponent(relativePath));

        if (!resolvedPath.startsWith(PROJECT_ROOT)) {
            await route.fulfill({ status: 403, body: 'Forbidden' });
            return;
        }

        if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
            await route.fulfill({ status: 404, body: 'Not found' });
            return;
        }

        await route.fulfill({
            status: 200,
            body: fs.readFileSync(resolvedPath),
            contentType: getContentType(resolvedPath)
        });
    });
});

test('tracks views, renders badges, and excludes quiz and battle badges', async ({ page }, testInfo) => {
    test.slow();

    const consoleMessages = [];
    const rpcPayloads = [];

    page.on('console', message => {
        consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });

    page.on('request', request => {
        if (request.url().includes('/rest/v1/rpc/increment_sticker_views')) {
            rpcPayloads.push(request.postData() || '');
        }
    });

    const beforeCount = await getViewCount(page, CLUB_STICKER_ID);

    await page.goto(CLUB_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.sticker-view-badge').first()).toBeVisible();
    await waitForTrackedImage(page, '.sticker-gallery img[data-sticker-id="20"]');
    await page.screenshot({ path: testInfo.outputPath('club-page.png'), fullPage: true });

    await expect.poll(() => rpcPayloads.length, { timeout: 15000 }).toBeGreaterThan(0);

    const afterCount = await getViewCount(page, CLUB_STICKER_ID);
    expect(afterCount).toBeGreaterThan(beforeCount);

    await page.goto(COUNTRY_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.cat-country-card .sticker-view-badge').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('country-page.png'), fullPage: true });

    await page.goto(CITY_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.sticker-gallery .sticker-view-badge').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('city-page.png'), fullPage: true });

    await page.goto(STICKER_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.sticker-detail-image-container .sticker-view-badge')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('sticker-page.png'), fullPage: true });

    const rpcCountBeforeQuiz = rpcPayloads.length;
    await page.goto(QUIZ_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.sticker-view-badge')).toHaveCount(0);
    await expect(page.locator('#sticker-image')).toHaveAttribute('data-sticker-id', /\d+/);
    await waitForTrackedImage(page, '#sticker-image');

    await expect.poll(() => rpcPayloads.length, { timeout: 15000 }).toBeGreaterThan(rpcCountBeforeQuiz);
    await page.screenshot({ path: testInfo.outputPath('quiz-page.png'), fullPage: true });

    const rpcCountBeforeBattle = rpcPayloads.length;
    await page.goto(BATTLE_PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.sticker-view-badge')).toHaveCount(0);
    await expect(page.locator('#sticker-a-img')).toHaveAttribute('data-sticker-id', /\d+/);
    await waitForTrackedImage(page, '#sticker-a-img');

    await expect.poll(() => rpcPayloads.length, { timeout: 15000 }).toBeGreaterThan(rpcCountBeforeBattle);
    await page.screenshot({ path: testInfo.outputPath('battle-page.png'), fullPage: true });

    await testInfo.attach('console-output', {
        body: Buffer.from(consoleMessages.join('\n')),
        contentType: 'text/plain'
    });

    await testInfo.attach('rpc-payloads', {
        body: Buffer.from(rpcPayloads.join('\n')),
        contentType: 'text/plain'
    });
});
