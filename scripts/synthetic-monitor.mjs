#!/usr/bin/env node
/**
 * Synthetic production monitor.
 *
 * Loads every key page of the LIVE site in a real (headless) browser and asserts
 * it actually works — not just HTTP 200, but: no JS init failure, no critical
 * console errors, and the page's main content actually rendered. Client-rendered
 * pages (rating, catalogue, quiz, ...) can return 200 while being completely broken
 * (e.g. "Initialization error"), so a real browser is the only honest check.
 *
 * On ANY failure it sends ONE Telegram alert (Самаритянин bot) and exits non-zero
 * so the GitHub Actions run is also marked red. All-green = silent (no spam).
 *
 * Env:
 *   BASE_URL            (default https://stickerhunt.club)
 *   TELEGRAM_BOT_TOKEN  (required to actually send the alert)
 *   TELEGRAM_CHAT_ID    (default 292048 — Victor)
 *
 * Run:  node scripts/synthetic-monitor.mjs
 */

import * as pw from 'playwright';
const chromium = pw.chromium || (pw.default && pw.default.chromium);

const BASE = (process.env.BASE_URL || 'https://stickerhunt.club').replace(/\/$/, '');
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '292048';

// Sentinels that mean "this page rendered an error to the user".
const ERROR_TEXT = [
    'Initialization error',
    'cannot be loaded',
    'Cannot load',
    'Error: Cannot',
    'Access Denied', // only flagged where it shouldn't appear (see allowAccessDenied)
    'Something went wrong',
    'Failed to load'
];

// Console error substrings that indicate a real breakage (not 3rd-party noise).
const CRITICAL_CONSOLE = [
    'SharedUtils not loaded',
    'failed to initialize',
    'is not defined',
    'is not a function',
    'Uncaught',
    'ReferenceError',
    'TypeError',
    'SyntaxError'
];

// Each check: { name, path, expect?: cssSelector that must be present & visible,
//   expectText?: substring that must appear in body, allowAccessDenied?: bool }
const CHECKS = [
    { name: 'Homepage',     path: '/index.html',       expect: '.hp-search-input, .hp-country-card', expectText: 'Football Sticker Database' },
    { name: 'Rating',       path: '/rating.html',      expect: '#rating-content a[href*="/stickers/"], #rating-content img' },
    { name: 'Leaderboard',  path: '/leaderboard.html', expectText: 'Leaderboard' },
    { name: 'Catalogue',    path: '/catalogue.html',   expect: 'a[href*="/stickers/"], img' },
    { name: 'Quiz',         path: '/quiz.html',        expect: '#sticker-container img, #home-sticker-image, img' },
    { name: 'Clubs',        path: '/clubs.html',       expect: 'a[href*="/clubs/"]' },
    { name: 'Map',          path: '/map.html',         expect: '#map, .leaflet-container' },
    { name: 'Battle',       path: '/battle.html',      softContent: true },
    { name: 'Profile',      path: '/profile.html',     softContent: true, allowAccessDenied: true },
    { name: 'Sticker stats',path: '/stickerstat.html', softContent: true },
    { name: 'Sticker log',  path: '/stickerlog.html',  softContent: true },
    // Uploaders / admin — auth-gated, so "Access Denied" / login is OK; we only want
    // them to load without a JS crash.
    { name: 'Upload (single)', path: '/upload.html',       softContent: true, allowAccessDenied: true },
    { name: 'Upload (batch)',  path: '/upload-batch.html', softContent: true, allowAccessDenied: true },
    { name: 'Club create',     path: '/club-create.html',  softContent: true, allowAccessDenied: true },
    // Static pre-rendered pages — must be 200 with an <h1>.
    { name: 'Sticker page (static)', path: '/stickers/3699.html', expect: 'h1' },
    { name: 'Club page (static)',    path: '/clubs/880.html',     expect: 'h1' },
];

async function runCheck(browser, check) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

    const failures = [];
    const url = BASE + check.path;
    try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        if (!resp || resp.status() >= 400) {
            failures.push(`HTTP ${resp ? resp.status() : 'no-response'}`);
        }
        // Let client JS run (init + first data fetch).
        await page.waitForTimeout(3500);

        const body = await page.evaluate(() => document.body ? document.body.innerText : '');

        // Error sentinels in visible text.
        for (const sentinel of ERROR_TEXT) {
            if (sentinel === 'Access Denied' && check.allowAccessDenied) continue;
            if (body.includes(sentinel)) failures.push(`page shows "${sentinel}"`);
        }

        // Critical console errors.
        const crit = consoleErrors.filter((e) => CRITICAL_CONSOLE.some((p) => e.includes(p)));
        if (crit.length) failures.push(`console: ${crit.slice(0, 2).join(' | ').slice(0, 200)}`);

        // Positive content.
        if (check.expect) {
            const found = await page.evaluate((sel) => !!document.querySelector(sel), check.expect);
            if (!found) failures.push(`missing expected content (${check.expect})`);
        }
        if (check.expectText && !body.includes(check.expectText)) {
            failures.push(`missing expected text "${check.expectText}"`);
        }
        if (check.softContent && body.trim().length < 40) {
            failures.push('page is blank');
        }
    } catch (err) {
        failures.push('load error: ' + (err.message || String(err)).slice(0, 160));
    } finally {
        await page.close();
    }
    return { name: check.name, path: check.path, ok: failures.length === 0, failures };
}

async function sendTelegram(text) {
    if (!TG_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN not set — cannot send alert.');
        return;
    }
    const body = new URLSearchParams({
        chat_id: TG_CHAT,
        parse_mode: 'HTML',
        disable_web_page_preview: 'true',
        text
    });
    try {
        const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        if (!r.ok) console.error('Telegram send failed:', r.status, await r.text());
    } catch (e) {
        console.error('Telegram send exception:', e.message);
    }
}

(async () => {
    console.log(`🔎 Synthetic monitor → ${BASE}`);
    const browser = await chromium.launch();
    const results = [];
    for (const check of CHECKS) {
        let r = await runCheck(browser, check);
        // Retry once before declaring broken — kills transient network/CDN blips
        // so we don't cry wolf, while still catching real breakage.
        if (!r.ok) {
            await new Promise((res) => setTimeout(res, 2500));
            r = await runCheck(browser, check);
        }
        results.push(r);
        console.log(`${r.ok ? '✅' : '❌'} ${r.name} (${r.path})${r.ok ? '' : ' — ' + r.failures.join('; ')}`);
    }
    await browser.close();

    const broken = results.filter((r) => !r.ok);
    if (broken.length === 0) {
        console.log(`\n✅ All ${results.length} checks passed.`);
        return;
    }

    const lines = broken.map((b) => `• <b>${b.name}</b> (${b.path})\n   ${b.failures.map(escapeHtml).join('\n   ')}`);
    const msg = `🚨 <b>StickerHunt is broken</b> — ${broken.length}/${results.length} checks failing\n\n${lines.join('\n\n')}\n\n${BASE}`;
    console.error(`\n❌ ${broken.length}/${results.length} checks failed — sending Telegram alert.`);
    await sendTelegram(msg);
    process.exit(1);
})().catch(async (err) => {
    console.error('Monitor crashed:', err);
    await sendTelegram(`🚨 <b>StickerHunt monitor crashed</b>\n${escapeHtml((err && err.message) || String(err))}`);
    process.exit(2);
});

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
