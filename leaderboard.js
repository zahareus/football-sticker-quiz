// leaderboard.js - Dedicated leaderboard page
// Uses SharedUtils from shared.js for common functionality

let supabaseClient;

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before leaderboard.js');
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
    if (supabaseClient) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeLeaderboardPage);
        } else {
            initializeLeaderboardPage();
        }
    }
}

// DOM Elements
let leaderboardListElement;
let leaderboardTimeFilterButtons;
let leaderboardDifficultyFilterButtons;
let leaderboardModeFilterButtons;
let loadingIndicator;
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

// Leaderboard State
let currentLeaderboardTimeframe = 'today';
let currentLeaderboardDifficulty = 1;
let currentLeaderboardMode = 'results'; // 'results' or 'players'

// Display settings
const DISPLAY_LIMIT = 5; // Show top 5 results
const FETCH_LIMIT = 100; // Fetch more to find user's position

// Initialize page
function initializeLeaderboardPage() {
    // Get DOM elements
    leaderboardListElement = document.getElementById('leaderboard-list');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    leaderboardModeFilterButtons = document.querySelectorAll('.leaderboard-mode-filter');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');

    // Auth DOM elements
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Set up event listeners
    leaderboardTimeFilterButtons.forEach(button => {
        button.addEventListener('click', handleTimeFilterChange);
    });
    leaderboardDifficultyFilterButtons.forEach(button => {
        button.addEventListener('click', handleDifficultyFilterChange);
    });
    leaderboardModeFilterButtons.forEach(button => {
        button.addEventListener('click', handleModeFilterChange);
    });

    // Set up auth and nickname editing
    setupAuth();
    setupNicknameEditing();

    // Load initial leaderboard data
    updateLeaderboard();
}

// ========== LEADERBOARD FUNCTIONS ==========

async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) {
        showError("DB connection error.");
        return null;
    }

    showLoading();
    hideError();

    try {
        // Use shared calculateTimeRange for consistent timezone handling
        const { fromDate, toDate } = SharedUtils.calculateTimeRange(timeframe);

        let query = supabaseClient
            .from('scores')
            .select(`score, created_at, user_id, profiles ( username )`)
            .eq('difficulty', difficulty);

        if (fromDate) {
            query = query.gte('created_at', fromDate);
        }
        if (toDate) {
            query = query.lt('created_at', toDate);
        }

        query = query
            .order('score', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(FETCH_LIMIT);

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        showError(`Could not load: ${error.message}`);
        return null;
    } finally {
        hideLoading();
    }
}

function displayLeaderboard(data) {
    if (!leaderboardListElement) return;

    leaderboardListElement.innerHTML = '';

    if (!data) {
        leaderboardListElement.innerHTML = '<li>Error loading.</li>';
        return;
    }

    if (data.length === 0) {
        leaderboardListElement.innerHTML = '<li>No scores found.</li>';
        return;
    }

    const currentUserId = currentUser?.id;

    // Process data based on mode
    let processedData = data;
    if (currentLeaderboardMode === 'players') {
        // Keep only the best result per player
        const seenUsers = new Set();
        processedData = data.filter(entry => {
            if (seenUsers.has(entry.user_id)) {
                return false;
            }
            seenUsers.add(entry.user_id);
            return true;
        });
    }

    // Find current user's position and entry in the processed data
    let userPosition = -1;
    let userEntry = null;
    if (currentUserId) {
        for (let i = 0; i < processedData.length; i++) {
            if (processedData[i].user_id === currentUserId) {
                userPosition = i + 1; // 1-based position
                userEntry = processedData[i];
                break;
            }
        }
    }

    // Get top 5 entries
    const topEntries = processedData.slice(0, DISPLAY_LIMIT);

    // Display top 5
    topEntries.forEach((entry, index) => {
        const li = document.createElement('li');
        li.setAttribute('value', index + 1);
        const username = entry.profiles?.username || 'Anonymous';
        const textNode = document.createTextNode(`${username} - ${entry.score}`);
        li.appendChild(textNode);

        if (currentUserId && entry.user_id === currentUserId) {
            li.classList.add('user-score');
        }

        leaderboardListElement.appendChild(li);
    });

    // If user is not in top 5 but has a score, show their position
    if (userPosition > DISPLAY_LIMIT && userEntry) {
        // Add separator (styled to match list items)
        const separatorDiv = document.createElement('div');
        separatorDiv.style.display = 'flex';
        separatorDiv.style.gap = '8px';
        separatorDiv.style.padding = '12px 8px';
        const separatorNumber = document.createElement('span');
        separatorNumber.style.minWidth = '2.5em';
        separatorNumber.style.textAlign = 'right';
        separatorNumber.textContent = '';
        const separatorDots = document.createElement('span');
        separatorDots.textContent = '...';
        separatorDiv.appendChild(separatorNumber);
        separatorDiv.appendChild(separatorDots);
        leaderboardListElement.appendChild(separatorDiv);

        // Add user's entry with their actual position (styled to match list items)
        const userDiv = document.createElement('div');
        userDiv.classList.add('user-score');
        userDiv.style.display = 'flex';
        userDiv.style.gap = '8px';
        userDiv.style.padding = '12px 8px';
        const positionSpan = document.createElement('span');
        positionSpan.style.fontWeight = '600';
        positionSpan.style.color = '#FFA000';
        positionSpan.style.minWidth = '2.5em';
        positionSpan.style.textAlign = 'right';
        positionSpan.textContent = `${userPosition}.`;
        const nameSpan = document.createElement('span');
        const username = userEntry.profiles?.username || 'Anonymous';
        nameSpan.textContent = `${username} - ${userEntry.score}`;
        userDiv.appendChild(positionSpan);
        userDiv.appendChild(nameSpan);
        leaderboardListElement.appendChild(userDiv);
    }
}

function updateFilterButtonsUI() {
    leaderboardTimeFilterButtons?.forEach(btn => {
        const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe;
        btn.classList.toggle('active', isActive);
        btn.disabled = isActive;
    });

    leaderboardDifficultyFilterButtons?.forEach(btn => {
        const btnDifficulty = parseInt(btn.dataset.difficulty, 10);
        const isActive = btnDifficulty === currentLeaderboardDifficulty;
        btn.classList.toggle('active', isActive);
        btn.disabled = isActive;
    });

    leaderboardModeFilterButtons?.forEach(btn => {
        const isActive = btn.dataset.mode === currentLeaderboardMode;
        btn.classList.toggle('active', isActive);
        btn.disabled = isActive;
    });
}

async function updateLeaderboard() {
    if (!leaderboardListElement) return;

    leaderboardListElement.innerHTML = '<li>Loading...</li>';
    updateFilterButtonsUI();

    const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty);
    displayLeaderboard(data);
}

function handleTimeFilterChange(event) {
    const button = event.currentTarget;
    const newTimeframe = button.dataset.timeframe;

    if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) {
        currentLeaderboardTimeframe = newTimeframe;
        updateLeaderboard();
    }
}

function handleDifficultyFilterChange(event) {
    const button = event.currentTarget;
    const newDifficulty = parseInt(button.dataset.difficulty, 10);

    if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) {
        currentLeaderboardDifficulty = newDifficulty;
        updateLeaderboard();
    }
}

function handleModeFilterChange(event) {
    const button = event.currentTarget;
    const newMode = button.dataset.mode;

    if (newMode && newMode !== currentLeaderboardMode) {
        currentLeaderboardMode = newMode;
        updateLeaderboard();
    }
}

// ========== HELPER FUNCTIONS ==========

function showError(message) {
    console.error("Error:", message);
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    }
}

function hideError() {
    if (errorMessageElement) {
        errorMessageElement.style.display = 'none';
        errorMessageElement.textContent = '';
    }
}

function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
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
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';

        // Update leaderboard to highlight user's score
        updateLeaderboard();
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
    if (!userNicknameElement) {
        return;
    }

    // Add click listener for nickname
    userNicknameElement.addEventListener('click', showNicknameEditForm);

    // Add form handlers
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

        // Update leaderboard to show new nickname
        updateLeaderboard();

        alert('Nickname updated successfully!');
    }
}
