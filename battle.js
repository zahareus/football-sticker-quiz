// battle.js - Sticker Battle (ELO Rating) functionality

// ============================================================
// CONFIGURATION
// ============================================================

const BATTLE_CONFIG = {
    SESSION_KEY: 'battle_session_id',
    ANIMATION_DURATION: 800,  // ms for winner/loser animation
    PRELOAD_DELAY: 100,       // ms delay before preloading next pair
    MIN_STICKERS_REQUIRED: 2
};

// ============================================================
// STATE
// ============================================================

let battleState = {
    sessionId: null,
    currentPair: null,
    nextPair: null,           // Preloaded next pair
    isVoting: false,
    isLoadingNext: false,
    supabase: null,
    totalVotes: 0
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Battle page initializing...');

    // Initialize Supabase
    battleState.supabase = getSupabaseClient();
    if (!battleState.supabase) {
        showError('Failed to initialize database connection');
        return;
    }

    // Initialize or retrieve session ID
    initSession();

    // Setup auth UI (from shared.js)
    if (typeof setupAuthUI === 'function') {
        setupAuthUI();
    }

    // Load initial pair
    await loadNewPair();

    // Setup event listeners
    setupEventListeners();

    // Load total votes count
    loadTotalVotes();

    console.log('Battle page initialized successfully');
});

// ============================================================
// SESSION MANAGEMENT
// ============================================================

function initSession() {
    // Try to get existing session from localStorage
    let sessionId = localStorage.getItem(BATTLE_CONFIG.SESSION_KEY);

    if (!sessionId) {
        // Generate new session ID
        sessionId = generateSessionId();
        localStorage.setItem(BATTLE_CONFIG.SESSION_KEY, sessionId);
        console.log('New battle session created:', sessionId);
    } else {
        console.log('Existing battle session found:', sessionId);
    }

    battleState.sessionId = sessionId;
}

function generateSessionId() {
    // Generate a unique session ID: timestamp + random string
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `battle_${timestamp}_${randomPart}`;
}

// ============================================================
// PAIR LOADING
// ============================================================

async function loadNewPair() {
    const loadingEl = document.getElementById('battle-loading');
    const contentEl = document.getElementById('battle-content');
    const errorEl = document.getElementById('battle-error');
    const resultEl = document.getElementById('battle-result');

    // Check if we have a preloaded pair
    if (battleState.nextPair) {
        console.log('Using preloaded pair');
        battleState.currentPair = battleState.nextPair;
        battleState.nextPair = null;
        displayPair(battleState.currentPair);

        // Preload next pair in background
        preloadNextPair();
        return;
    }

    // Show loading state
    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    errorEl.style.display = 'none';
    resultEl.style.display = 'none';

    try {
        const pair = await fetchPair();

        if (!pair) {
            throw new Error('No pair returned from server');
        }

        battleState.currentPair = pair;
        displayPair(pair);

        // Hide loading, show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'flex';

        // Preload next pair in background
        preloadNextPair();

    } catch (error) {
        console.error('Error loading pair:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

async function fetchPair() {
    console.log('Fetching new pair for session:', battleState.sessionId);

    const { data, error } = await battleState.supabase
        .rpc('get_battle_pair', { p_session_id: battleState.sessionId });

    if (error) {
        console.error('RPC error:', error);
        throw error;
    }

    console.log('Pair received:', data);
    return data;
}

async function preloadNextPair() {
    if (battleState.isLoadingNext) return;

    battleState.isLoadingNext = true;

    // Small delay before preloading
    await new Promise(resolve => setTimeout(resolve, BATTLE_CONFIG.PRELOAD_DELAY));

    try {
        const pair = await fetchPair();
        battleState.nextPair = pair;

        // Preload images
        if (pair && pair.sticker_a && pair.sticker_b) {
            preloadImage(getWebImageUrl(pair.sticker_a.image_url));
            preloadImage(getWebImageUrl(pair.sticker_b.image_url));
        }

        console.log('Next pair preloaded');
    } catch (error) {
        console.error('Error preloading next pair:', error);
        battleState.nextPair = null;
    }

    battleState.isLoadingNext = false;
}

function preloadImage(url) {
    const img = new Image();
    img.src = url;
}

// ============================================================
// DISPLAY
// ============================================================

function displayPair(pair) {
    const stickerAEl = document.getElementById('sticker-a');
    const stickerBEl = document.getElementById('sticker-b');
    const imgA = document.getElementById('sticker-a-img');
    const imgB = document.getElementById('sticker-b-img');

    // Set data attributes
    stickerAEl.dataset.id = pair.sticker_a.id;
    stickerBEl.dataset.id = pair.sticker_b.id;

    // Set images
    imgA.src = getWebImageUrl(pair.sticker_a.image_url);
    imgB.src = getWebImageUrl(pair.sticker_b.image_url);

    imgA.alt = `Sticker #${pair.sticker_a.id}`;
    imgB.alt = `Sticker #${pair.sticker_b.id}`;

    // Reset any animation classes
    stickerAEl.classList.remove('winner', 'loser', 'fade-out');
    stickerBEl.classList.remove('winner', 'loser', 'fade-out');

    // Enable clicking
    battleState.isVoting = false;

    console.log('Displaying pair:', pair.sticker_a.id, 'vs', pair.sticker_b.id);
}

function getWebImageUrl(originalUrl) {
    // Convert to _web.webp version
    if (!originalUrl) return '';

    // Check if already has _web.webp
    if (originalUrl.includes('_web.webp')) {
        return originalUrl;
    }

    // Replace extension with _web.webp
    const lastDotIndex = originalUrl.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        return originalUrl.substring(0, lastDotIndex) + '_web.webp';
    }

    return originalUrl + '_web.webp';
}

// ============================================================
// VOTING
// ============================================================

function setupEventListeners() {
    const stickerA = document.getElementById('sticker-a');
    const stickerB = document.getElementById('sticker-b');

    stickerA.addEventListener('click', () => handleVote('a'));
    stickerB.addEventListener('click', () => handleVote('b'));

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (battleState.isVoting) return;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '1') {
            handleVote('a');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '2') {
            handleVote('b');
        }
    });
}

async function handleVote(choice) {
    if (battleState.isVoting || !battleState.currentPair) {
        return;
    }

    battleState.isVoting = true;

    const pair = battleState.currentPair;
    const winnerId = choice === 'a' ? pair.sticker_a.id : pair.sticker_b.id;
    const loserId = choice === 'a' ? pair.sticker_b.id : pair.sticker_a.id;

    console.log('Vote:', winnerId, 'beats', loserId);

    // Start animation immediately
    playVoteAnimation(choice);

    // Submit vote to server
    try {
        const result = await submitVote(
            pair.sticker_a.id,
            pair.sticker_b.id,
            winnerId
        );

        if (result && result.ok) {
            console.log('Vote submitted successfully:', result);

            // Update total votes
            battleState.totalVotes++;
            updateVotesDisplay();

            // Show rating change in animation
            showRatingChange(choice, result);

            // Track with Amplitude if available
            if (typeof amplitude !== 'undefined') {
                amplitude.track('Battle Vote', {
                    winner_id: winnerId,
                    loser_id: loserId,
                    winner_rating_before: result.winner.rating_before,
                    winner_rating_after: result.winner.rating_after
                });
            }

            // PostHog: track battle vote
            trackBattleVote(winnerId, loserId, result.winner.rating_before, result.winner.rating_after);
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
    }

    // Wait for animation then load next pair
    setTimeout(() => {
        loadNewPair();
    }, BATTLE_CONFIG.ANIMATION_DURATION);
}

async function submitVote(stickerAId, stickerBId, winnerId) {
    const { data, error } = await battleState.supabase
        .rpc('submit_vote', {
            p_session_id: battleState.sessionId,
            p_sticker_a_id: stickerAId,
            p_sticker_b_id: stickerBId,
            p_winner_id: winnerId
        });

    if (error) {
        console.error('Vote RPC error:', error);
        throw error;
    }

    return data;
}

// ============================================================
// ANIMATIONS
// ============================================================

function playVoteAnimation(winnerChoice) {
    const stickerA = document.getElementById('sticker-a');
    const stickerB = document.getElementById('sticker-b');
    const vsElement = document.querySelector('.battle-vs');

    if (winnerChoice === 'a') {
        stickerA.classList.add('winner');
        stickerB.classList.add('loser');
    } else {
        stickerB.classList.add('winner');
        stickerA.classList.add('loser');
    }

    // Hide VS during animation
    if (vsElement) {
        vsElement.classList.add('fade-out');
    }
}

function showRatingChange(winnerChoice, result) {
    const winnerSticker = winnerChoice === 'a'
        ? document.getElementById('sticker-a')
        : document.getElementById('sticker-b');

    const ratingChange = result.winner.rating_after - result.winner.rating_before;

    // Create floating rating indicator
    const ratingEl = document.createElement('div');
    ratingEl.className = 'rating-change-indicator';
    ratingEl.textContent = `+${ratingChange}`;

    winnerSticker.appendChild(ratingEl);

    // Remove after animation
    setTimeout(() => {
        ratingEl.remove();
    }, BATTLE_CONFIG.ANIMATION_DURATION);
}

// ============================================================
// STATS
// ============================================================

async function loadTotalVotes() {
    try {
        const { count, error } = await battleState.supabase
            .from('votes')
            .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
            battleState.totalVotes = count;
            updateVotesDisplay();
        }
    } catch (error) {
        console.error('Error loading total votes:', error);
    }
}

function updateVotesDisplay() {
    const statsEl = document.getElementById('total-votes');
    if (statsEl) {
        statsEl.textContent = `${battleState.totalVotes.toLocaleString()} votes cast`;
    }
}

// ============================================================
// ERROR HANDLING
// ============================================================

function showError(message) {
    const loadingEl = document.getElementById('battle-loading');
    const contentEl = document.getElementById('battle-content');
    const errorEl = document.getElementById('battle-error');

    loadingEl.style.display = 'none';
    contentEl.style.display = 'none';
    errorEl.style.display = 'block';

    const errorText = errorEl.querySelector('p');
    if (errorText) {
        errorText.textContent = message;
    }
}

// Make loadNewPair available globally for retry button
window.loadNewPair = loadNewPair;
