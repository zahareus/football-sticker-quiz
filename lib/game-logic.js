// Pure game logic extracted for testability
// Mirrors logic from script.js and shared.js

export const TTR_PATTERN_LENGTH = 6;

export function getTTRDifficulty(index) {
  const patternIndex = index % TTR_PATTERN_LENGTH;
  if (patternIndex < 3) return 1;  // Easy
  if (patternIndex < 5) return 2;  // Medium
  return 3;                         // Hard
}

export const CONFIG = {
  TIMER_DURATION: 10,
  TTR_TIMER_DURATION: 60,
  DAILY_TIMER_DURATION: 45,
  DAILY_TOTAL_STICKERS: 18,
  LEADERBOARD_LIMIT: 10,
  GAME_MODE_CLASSIC: 'classic',
  GAME_MODE_TTR: 'ttr',
  GAME_MODE_DAILY: 'daily',
  NICKNAME_MIN_LENGTH: 3,
  NICKNAME_MAX_LENGTH: 25,
  NICKNAME_DISPLAY_MAX_LENGTH: 12,
};

export function calculateTimeRange(timeframe) {
  const now = new Date();
  let fromDate = null;
  let toDate = null;

  switch (timeframe) {
    case 'today': {
      const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1);
      fromDate = startOfDay.toISOString();
      toDate = startOfNextDay.toISOString();
      break;
    }
    case 'week': {
      const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
      fromDate = startOfWeek.toISOString();
      break;
    }
    case 'month': {
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()));
      fromDate = startOfMonth.toISOString();
      break;
    }
    case 'all':
    default:
      // No date filter
      break;
  }

  return { fromDate, toDate };
}

export function generateSessionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `battle_${timestamp}_${randomPart}`;
}
