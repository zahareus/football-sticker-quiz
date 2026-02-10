// posthog-analytics.js - PostHog analytics helpers for StickerHunt
// Mirrors the Amplitude integration pattern used in shared.js

// ============================================================
// USER IDENTIFICATION
// ============================================================

/**
 * Identify user in PostHog when they sign in
 * @param {Object} user - Supabase user object
 * @param {Object} profile - User profile with nickname
 */
function identifyPosthogUser(user, profile = null) {
    if (typeof window.posthog === 'undefined') return;

    try {
        window.posthog.identify(user.id, {
            email: user.email,
            provider: user.app_metadata?.provider || 'unknown',
            created_at: user.created_at,
            nickname: profile?.nickname || profile?.username || null,
        });
    } catch (error) {
        console.error('PostHog: Error identifying user:', error);
    }
}

/**
 * Reset PostHog user when they sign out
 */
function resetPosthogUser() {
    if (typeof window.posthog === 'undefined') return;

    try {
        window.posthog.reset();
    } catch (error) {
        console.error('PostHog: Error resetting user:', error);
    }
}

// ============================================================
// QUIZ EVENTS
// ============================================================

/**
 * Track quiz game start
 * @param {string} mode - 'classic' | 'ttr' | 'daily'
 * @param {number|null} difficulty - 1, 2, or 3 (null for TTR/Daily)
 */
function trackQuizStarted(mode, difficulty) {
    if (typeof window.posthog === 'undefined') return;

    window.posthog.capture('quiz_started', {
        game_mode: mode,
        difficulty: difficulty,
    });
}

/**
 * Track a quiz answer
 * @param {string} mode - game mode
 * @param {number|null} difficulty - difficulty level
 * @param {number} sticker_id - the sticker being guessed
 * @param {boolean} is_correct - whether the answer was correct
 */
function trackQuizAnswered(mode, difficulty, sticker_id, is_correct) {
    if (typeof window.posthog === 'undefined') return;

    window.posthog.capture('quiz_answered', {
        game_mode: mode,
        difficulty: difficulty,
        sticker_id: sticker_id,
        is_correct: is_correct,
    });
}

/**
 * Track quiz game completion
 * @param {string} mode - game mode
 * @param {number|null} difficulty - difficulty level
 * @param {number} score - final score
 * @param {boolean} daily_win - true if daily quiz was won
 */
function trackQuizCompleted(mode, difficulty, score, daily_win) {
    if (typeof window.posthog === 'undefined') return;

    window.posthog.capture('quiz_completed', {
        game_mode: mode,
        difficulty: difficulty,
        final_score: score,
        daily_win: daily_win,
    });
}

/**
 * Track score saved to leaderboard
 * @param {number} score
 * @param {number|null} difficulty
 * @param {string} mode
 */
function trackScoreSaved(score, difficulty, mode) {
    if (typeof window.posthog === 'undefined') return;

    window.posthog.capture('score_saved', {
        score: score,
        difficulty: difficulty,
        game_mode: mode,
    });
}

// ============================================================
// BATTLE EVENTS
// ============================================================

/**
 * Track a battle vote
 * @param {number} winner_id
 * @param {number} loser_id
 * @param {number} rating_before
 * @param {number} rating_after
 */
function trackBattleVote(winner_id, loser_id, rating_before, rating_after) {
    if (typeof window.posthog === 'undefined') return;

    window.posthog.capture('battle_vote', {
        winner_id: winner_id,
        loser_id: loser_id,
        winner_rating_before: rating_before,
        winner_rating_after: rating_after,
        rating_change: rating_after - rating_before,
    });
}
