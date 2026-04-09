import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

const CLIENT_JS_FILES = ['script.js', 'battle.js', 'shared.js', 'index-script.js', 'leaderboard.js', 'profile.js', 'catalogue.js'];
const HTML_PAGES = ['index.html', 'quiz.html', 'battle.html', 'catalogue.html', 'leaderboard.html'];

describe('client sanity checks', () => {
  it('no service_role keys in client files', () => {
    for (const file of CLIENT_JS_FILES) {
      const path = join(ROOT, file);
      if (!existsSync(path)) continue;
      const content = readFileSync(path, 'utf8');
      expect(content, `${file} should not contain service_role`).not.toMatch(/service_role/);
    }
  });

  it('shared.js only contains anon key, not service role', () => {
    const content = readFileSync(join(ROOT, 'shared.js'), 'utf8');
    expect(content).toContain('SUPABASE_ANON_KEY');
    expect(content).not.toMatch(/service_role_key|SUPABASE_SERVICE/i);
  });

  it('no escaped template literals in JS files', () => {
    for (const file of CLIENT_JS_FILES) {
      const path = join(ROOT, file);
      if (!existsSync(path)) continue;
      const content = readFileSync(path, 'utf8');
      const escaped = content.match(/\\\$\{/g);
      expect(escaped, `${file} has escaped template literals`).toBeNull();
    }
  });

  it('all HTML pages exist', () => {
    for (const page of HTML_PAGES) {
      const path = join(ROOT, page);
      expect(existsSync(path), `${page} should exist`).toBe(true);
    }
  });

  it('HTML pages reference shared.js before their own scripts', () => {
    const quizHtml = readFileSync(join(ROOT, 'quiz.html'), 'utf8');
    const sharedIdx = quizHtml.indexOf('shared.js');
    const scriptIdx = quizHtml.indexOf('script.js');
    if (sharedIdx !== -1 && scriptIdx !== -1) {
      expect(sharedIdx).toBeLessThan(scriptIdx);
    }
  });

  it('CONFIG values are consistent between shared.js and lib/game-logic.js', () => {
    const shared = readFileSync(join(ROOT, 'shared.js'), 'utf8');

    // Extract key config values from shared.js
    const timerMatch = shared.match(/TIMER_DURATION:\s*(\d+)/);
    const ttrMatch = shared.match(/TTR_TIMER_DURATION:\s*(\d+)/);
    const dailyMatch = shared.match(/DAILY_TIMER_DURATION:\s*(\d+)/);
    const dailyStickersMatch = shared.match(/DAILY_TOTAL_STICKERS:\s*(\d+)/);

    expect(timerMatch).not.toBeNull();
    expect(Number(timerMatch[1])).toBe(10);
    expect(Number(ttrMatch[1])).toBe(60);
    expect(Number(dailyMatch[1])).toBe(45);
    expect(Number(dailyStickersMatch[1])).toBe(18);
  });
});
