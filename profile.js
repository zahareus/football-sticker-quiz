// profile.js - Player profile page
// Uses SharedUtils from shared.js for common functionality

let supabaseClient;

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before profile.js');
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
    if (supabaseClient) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeProfilePage);
        } else {
            initializeProfilePage();
        }
    }
}

// DOM Elements
let profileContentElement;
let errorMessageElement;
let loginButton;
let logoutButton;
let userStatusElement;
let userNicknameElement;

// Edit nickname form elements
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Auth State
let currentUser = null;
let currentUserProfile = null;

// Profile being viewed
let viewedUserId = null;

// Difficulty labels
const DIFFICULTY_LABELS = {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard'
};

// Initialize page
function initializeProfilePage() {
    // Get DOM elements
    profileContentElement = document.getElementById('profile-content');
    errorMessageElement = document.getElementById('error-message');

    // Auth DOM elements
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Get user ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    viewedUserId = urlParams.get('id');

    if (!viewedUserId) {
        showError('No player ID specified. Please select a player from the leaderboard.');
        hideLoading();
        return;
    }

    // Set up auth and nickname editing
    setupAuth();
    setupNicknameEditing();

    // Load profile data
    loadProfileData();
}

// ========== PROFILE DATA FUNCTIONS ==========

async function loadProfileData() {
    if (!supabaseClient || !viewedUserId) {
        showError('Cannot load profile.');
        return;
    }

    try {
        // Fetch profile info
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, username, created_at, updated_at')
            .eq('id', viewedUserId)
            .maybeSingle();

        if (profileError) {
            // Try without created_at if column doesn't exist
            if (profileError.message && profileError.message.includes('created_at')) {
                const { data: basicProfile, error: basicError } = await supabaseClient
                    .from('profiles')
                    .select('id, username, updated_at')
                    .eq('id', viewedUserId)
                    .maybeSingle();

                if (basicError) {
                    throw basicError;
                }

                if (!basicProfile) {
                    showError('Player not found.');
                    return;
                }

                // Use updated_at as registration date fallback
                await loadAndDisplayProfile({ ...basicProfile, created_at: basicProfile.updated_at });
                return;
            }
            throw profileError;
        }

        if (!profileData) {
            showError('Player not found.');
            return;
        }

        await loadAndDisplayProfile(profileData);

    } catch (error) {
        console.error('Error loading profile:', error);
        showError(`Could not load profile: ${error.message}`);
    }
}

async function loadAndDisplayProfile(profileData) {
    try {
        // Fetch all scores for this user
        const { data: scoresData, error: scoresError } = await supabaseClient
            .from('scores')
            .select('score, difficulty, created_at')
            .eq('user_id', viewedUserId)
            .order('score', { ascending: false });

        if (scoresError) {
            throw scoresError;
        }

        // Calculate stats
        const totalSessions = scoresData ? scoresData.length : 0;

        // Find best scores per difficulty
        const bestScores = {};
        if (scoresData) {
            for (const score of scoresData) {
                const diff = score.difficulty;
                if (!bestScores[diff] || score.score > bestScores[diff].score) {
                    bestScores[diff] = {
                        score: score.score,
                        date: score.created_at
                    };
                }
            }
        }

        // Get last 20 games for own profile (sorted by date descending)
        let lastGames = [];
        const isOwnProfile = currentUser && viewedUserId === currentUser.id;
        if (isOwnProfile && scoresData) {
            // Sort by date descending and take first 20
            lastGames = [...scoresData]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 20);
        }

        // Display profile
        displayProfile(profileData, totalSessions, bestScores, lastGames);

    } catch (error) {
        console.error('Error loading scores:', error);
        showError(`Could not load player statistics: ${error.message}`);
    }
}

function displayProfile(profileData, totalSessions, bestScores, lastGames = []) {
    if (!profileContentElement) return;

    const username = profileData.username || 'Anonymous';
    const registrationDate = formatDate(profileData.created_at || profileData.updated_at);
    const isOwnProfile = currentUser && viewedUserId === currentUser.id;

    // Update page title
    document.title = `${username} - StickerHunt`;

    // Build username display with ball emoji for own profile
    let usernameHtml;
    if (isOwnProfile) {
        usernameHtml = `<h1 class="profile-username">⚽ ${escapeHtml(username)} <a href="#" class="profile-edit-link" id="profile-edit-nickname">edit</a></h1>`;
    } else {
        usernameHtml = `<h1 class="profile-username">${escapeHtml(username)}</h1>`;
    }

    let html = `
        ${usernameHtml}

        <div class="profile-info">
            <p class="profile-stat">
                <span class="profile-stat-label">Member since:</span>
                <span class="profile-stat-value">${registrationDate}</span>
            </p>
            <p class="profile-stat">
                <span class="profile-stat-label">Games played:</span>
                <span class="profile-stat-value">${totalSessions}</span>
            </p>
        </div>

        <div class="profile-best-scores">
            <h2>Best Results</h2>
            <div class="best-scores-grid">
    `;

    // Add best scores for each difficulty
    for (let difficulty = 1; difficulty <= 3; difficulty++) {
        const diffLabel = DIFFICULTY_LABELS[difficulty];
        const bestScore = bestScores[difficulty];

        html += `
            <div class="best-score-card">
                <span class="best-score-difficulty">${diffLabel}</span>
                <span class="best-score-value">${bestScore ? bestScore.score : '—'}</span>
                ${bestScore ? `<span class="best-score-date">${formatDate(bestScore.date)}</span>` : '<span class="best-score-date">Not played yet</span>'}
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    // Add last games section for own profile
    if (isOwnProfile && lastGames.length > 0) {
        html += `
        <div class="profile-last-games">
            <h2>Your Last Games</h2>
            <div class="last-games-list">
        `;

        for (const game of lastGames) {
            const gameDate = formatDate(game.created_at);
            const diffLabel = DIFFICULTY_LABELS[game.difficulty] || 'Unknown';
            html += `
                <div class="last-game-item">
                    <span class="last-game-date">${gameDate}</span>
                    <span class="last-game-difficulty">${diffLabel}</span>
                    <span class="last-game-score">${game.score}</span>
                </div>
            `;
        }

        html += `
            </div>
        </div>
        `;
    }

    html += `
        <div class="home-actions" style="margin-top: 40px;">
            <a href="/quiz.html" class="btn btn-large">Play Quiz</a>
            <a href="/leaderboard.html" class="btn btn-large">View Leaderboard</a>
        </div>
    `;

    profileContentElement.innerHTML = html;

    // Add click handler for edit link if viewing own profile
    if (isOwnProfile) {
        const editLink = document.getElementById('profile-edit-nickname');
        if (editLink) {
            editLink.addEventListener('click', (e) => {
                e.preventDefault();
                showNicknameEditForm();
            });
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Unknown';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== HELPER FUNCTIONS ==========

function showError(message) {
    console.error("Error:", message);
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }
    hideLoading();
}

function hideError() {
    if (errorMessageElement) {
        errorMessageElement.style.display = 'none';
        errorMessageElement.textContent = '';
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('profile-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// ========== AUTH FUNCTIONS ==========

// Load user profile
async function loadAndSetUserProfile(user) {
    if (!supabaseClient || !user) return;

    const profile = await SharedUtils.loadUserProfile(supabaseClient, user);
    if (profile) {
        currentUserProfile = profile;
        SharedUtils.cacheUserProfile(profile);
    }
}

// Update auth UI
function updateAuthUI(user) {
    if (!loginButton || !userStatusElement || !userNicknameElement) return;

    if (user) {
        // User is logged in
        const displayName = currentUserProfile?.username || 'Loading...';
        userNicknameElement.textContent = SharedUtils.truncateString(displayName);
        userNicknameElement.href = `/profile.html?id=${user.id}`;
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';
    } else {
        // User is logged out - hide both (only show logo)
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'none';
    }
}

// Login with Google
function handleLoginClick() {
    if (!supabaseClient) return;
    SharedUtils.loginWithGoogle(supabaseClient, '/quiz.html').then(result => {
        if (result.error) {
            alert('Login failed. Please try again.');
        }
    });
}

// Logout
async function handleLogoutClick() {
    if (!supabaseClient) return;

    const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
    if (result.error) {
        alert('Logout failed. Please try again.');
    } else {
        window.location.reload();
    }
}

/**
 * Setup auth - CRITICAL FIX for mobile
 * Uses getSession() first, then sets up listener for future changes.
 * Ignores INITIAL_SESSION to avoid race conditions on mobile.
 */
function setupAuth() {
    if (!supabaseClient) return;

    // Set up button handlers
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
    }

    // Step 1: Get current session FIRST (this is the source of truth)
    supabaseClient.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error) {
            console.error('Error getting session:', error);
            updateAuthUI(null);
            setupAuthStateListener();
            return;
        }

        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile first for fast UI
            const cachedProfile = SharedUtils.loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                updateAuthUI(user);
            }

            // Load fresh profile and update UI
            await loadAndSetUserProfile(user);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }

        // Step 2: Set up listener for FUTURE auth changes only
        setupAuthStateListener();
    });
}

/**
 * Auth state listener - only for FUTURE changes after initial load
 * CRITICAL: Ignores INITIAL_SESSION to prevent race conditions on mobile
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: Skip INITIAL_SESSION - we already handled it in setupAuth()
        // This prevents race conditions on mobile where the same session gets processed twice
        if (event === 'INITIAL_SESSION') {
            return;
        }

        const user = session?.user ?? null;

        // Handle logout
        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                SharedUtils.clearCachedProfile(currentUser.id);
            }
            currentUser = null;
            currentUserProfile = null;
            updateAuthUI(null);
            return;
        }

        // Handle new sign in (e.g., from another tab)
        if (event === 'SIGNED_IN' && user) {
            // Only process if it's a different user or we don't have a user yet
            if (!currentUser || currentUser.id !== user.id) {
                currentUser = user;
                const cachedProfile = SharedUtils.loadCachedProfile(user.id);
                if (cachedProfile) {
                    currentUserProfile = cachedProfile;
                }
                updateAuthUI(user);
                await loadAndSetUserProfile(user);
                updateAuthUI(user);
            }
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && user) {
            currentUser = user;
        }
    });
}

// ========== NICKNAME EDITING FUNCTIONS ==========

function setupNicknameEditing() {
    // userNicknameElement href is updated in updateAuthUI
    // Form handlers for in-profile editing
    if (editNicknameForm) {
        editNicknameForm.addEventListener('submit', handleNicknameSave);
    }
    if (cancelEditNicknameButton) {
        cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);
    }
}

function showNicknameEditForm() {
    if (!currentUserProfile) {
        alert('Please wait for your profile to load...');
        return;
    }

    if (!editNicknameForm || !nicknameInputElement) {
        return;
    }

    nicknameInputElement.value = currentUserProfile.username || '';
    editNicknameForm.style.display = 'block';
    nicknameInputElement.focus();
    nicknameInputElement.select();
}

function hideNicknameEditForm() {
    if (!editNicknameForm || !nicknameInputElement) return;
    editNicknameForm.style.display = 'none';
    nicknameInputElement.value = '';
}

async function handleNicknameSave(event) {
    event.preventDefault();

    if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) {
        alert('Cannot save nickname');
        return;
    }

    const newNickname = nicknameInputElement.value.trim();

    if (newNickname === currentUserProfile.username) {
        hideNicknameEditForm();
        return;
    }

    const result = await SharedUtils.updateNickname(supabaseClient, currentUser.id, newNickname);

    if (result.error) {
        alert(`Update failed: ${result.error.message}`);
    } else {
        currentUserProfile.username = result.data.username;
        SharedUtils.cacheUserProfile(currentUserProfile);

        if (userNicknameElement) {
            userNicknameElement.textContent = SharedUtils.truncateString(result.data.username);
        }

        hideNicknameEditForm();

        // Reload profile if viewing own profile
        if (viewedUserId === currentUser.id) {
            loadProfileData();
        }

        alert('Nickname updated successfully!');
    }
}
