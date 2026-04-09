import { describe, it, expect } from 'vitest';
import { getTTRDifficulty, calculateTimeRange, generateSessionId, CONFIG } from '../lib/game-logic.js';

describe('getTTRDifficulty', () => {
  it('returns 1 (easy) for indices 0, 1, 2', () => {
    expect(getTTRDifficulty(0)).toBe(1);
    expect(getTTRDifficulty(1)).toBe(1);
    expect(getTTRDifficulty(2)).toBe(1);
  });

  it('returns 2 (medium) for indices 3, 4', () => {
    expect(getTTRDifficulty(3)).toBe(2);
    expect(getTTRDifficulty(4)).toBe(2);
  });

  it('returns 3 (hard) for index 5', () => {
    expect(getTTRDifficulty(5)).toBe(3);
  });

  it('repeats pattern after 6', () => {
    expect(getTTRDifficulty(6)).toBe(1);
    expect(getTTRDifficulty(7)).toBe(1);
    expect(getTTRDifficulty(8)).toBe(1);
    expect(getTTRDifficulty(9)).toBe(2);
    expect(getTTRDifficulty(10)).toBe(2);
    expect(getTTRDifficulty(11)).toBe(3);
  });

  it('works for large indices', () => {
    expect(getTTRDifficulty(100)).toBe(2); // 100 % 6 = 4 → medium
    expect(getTTRDifficulty(101)).toBe(3); // 101 % 6 = 5 → hard
    expect(getTTRDifficulty(102)).toBe(1); // 102 % 6 = 0 → easy
  });
});

describe('calculateTimeRange', () => {
  it('returns null dates for "all" timeframe', () => {
    const { fromDate, toDate } = calculateTimeRange('all');
    expect(fromDate).toBeNull();
    expect(toDate).toBeNull();
  });

  it('returns today range for "today" timeframe', () => {
    const { fromDate, toDate } = calculateTimeRange('today');
    expect(fromDate).toBeDefined();
    expect(toDate).toBeDefined();

    const from = new Date(fromDate);
    const to = new Date(toDate);
    // Should be exactly 1 day apart
    expect(to - from).toBe(24 * 60 * 60 * 1000);
  });

  it('returns fromDate for "week" timeframe', () => {
    const { fromDate, toDate } = calculateTimeRange('week');
    expect(fromDate).toBeDefined();
    expect(toDate).toBeNull();

    const from = new Date(fromDate);
    const now = new Date();
    const diffDays = (now - from) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThan(8);
  });

  it('returns fromDate for "month" timeframe', () => {
    const { fromDate, toDate } = calculateTimeRange('month');
    expect(fromDate).toBeDefined();
    expect(toDate).toBeNull();
  });

  it('handles unknown timeframe like "all"', () => {
    const { fromDate, toDate } = calculateTimeRange('unknown');
    expect(fromDate).toBeNull();
    expect(toDate).toBeNull();
  });
});

describe('generateSessionId', () => {
  it('starts with "battle_"', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^battle_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('CONFIG constants', () => {
  it('has correct game modes', () => {
    expect(CONFIG.GAME_MODE_CLASSIC).toBe('classic');
    expect(CONFIG.GAME_MODE_TTR).toBe('ttr');
    expect(CONFIG.GAME_MODE_DAILY).toBe('daily');
  });

  it('has correct timer durations', () => {
    expect(CONFIG.TIMER_DURATION).toBe(10);
    expect(CONFIG.TTR_TIMER_DURATION).toBe(60);
    expect(CONFIG.DAILY_TIMER_DURATION).toBe(45);
  });

  it('daily quiz has 18 stickers', () => {
    expect(CONFIG.DAILY_TOTAL_STICKERS).toBe(18);
  });

  it('nickname constraints are valid', () => {
    expect(CONFIG.NICKNAME_MIN_LENGTH).toBeLessThan(CONFIG.NICKNAME_MAX_LENGTH);
    expect(CONFIG.NICKNAME_DISPLAY_MAX_LENGTH).toBeLessThanOrEqual(CONFIG.NICKNAME_MAX_LENGTH);
  });
});
