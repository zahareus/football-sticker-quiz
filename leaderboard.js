// leaderboard.js - Dedicated leaderboard page

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

let supabaseClient;

// Initialize Supabase Client
if (typeof supabase === 'undefined') {
    console.error('Error: Supabase client library not loaded.');
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeLeaderboardPage);
        } else {
            initializeLeaderboardPage();
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        supabaseClient = null;
    }
}

// DOM Elements
let leaderboardListElement;
let leaderboardTimeFilterButtons;
let leaderboardDifficultyFilterButtons;
let loadingIndicator;
let errorMessageElement;
let loginButton;
let logoutButton;
let userStatusElement;
let userNicknameElement;

// Auth State
let currentUser = null;
let currentUserProfile = null;

// Leaderboard State
let currentLeaderboardTimeframe = 'today';
let currentLeaderboardDifficulty = 1;

// Initialize page
function initializeLeaderboardPage() {
    console.log('Initializing leaderboard page...');

    // Get DOM elements
    leaderboardListElement = document.getElementById('leaderboard-list');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');

    // Auth DOM elements
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');

    // Set up event listeners
    leaderboardTimeFilterButtons.forEach(button => {
        button.addEventListener('click', handleTimeFilterChange);
    });
    leaderboardDifficultyFilterButtons.forEach(button => {
        button.addEventListener('click', handleDifficultyFilterChange);
    });

    // Set up auth
    setupAuth();

    // Load initial leaderboard data
    updateLeaderboard();
}

// ========== LEADERBOARD FUNCTIONS ==========

function calculateTimeRange(timeframe) {
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    switch (timeframe) {
        case 'today':
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            break;
        case 'week':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            break;
        case 'all':
            fromDate = null;
            break;
        default:
            fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }

    return { fromDate, toDate };
}

async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) {
        showError("DB connection error.");
        return null;
    }

    console.log(`Fetching leaderboard: ${timeframe}, Difficulty ${difficulty}`);
    showLoading();
    hideError();

    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe);
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
            .limit(10);

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

    data.forEach((entry) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Anonymous';
        const textNode = document.createTextNode(`${username} - ${entry.score}`);
        li.appendChild(textNode);

        if (currentUserId && entry.user_id === currentUserId) {
            li.classList.add('user-score');
        }

        leaderboardListElement.appendChild(li);
    });
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

// Load cached profile from localStorage
function loadCachedProfile(userId) {
    if (!userId) return null;
    try {
        const cached = localStorage.getItem(`user_profile_${userId}`);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        // Cache valid for 24 hours
        if (age > 24 * 60 * 60 * 1000) {
            console.log('Cached profile expired');
            localStorage.removeItem(`user_profile_${userId}`);
            return null;
        }

        console.log(`✓ Loaded cached profile (age: ${Math.round(age / 1000)}s)`);
        return cacheData.profile;
    } catch (error) {
        console.warn('Failed to load cached profile:', error);
        return null;
    }
}

// Cache profile to localStorage
function cacheUserProfile(profile) {
    if (!profile || !profile.id) return;
    try {
        const cacheData = {
            profile: profile,
            timestamp: Date.now()
        };
        localStorage.setItem(`user_profile_${profile.id}`, JSON.stringify(cacheData));
        console.log(`✓ Profile cached for user ${profile.id}`);
    } catch (error) {
        console.warn('Failed to cache profile:', error);
    }
}

// Clear cached profile
function clearCachedProfile(userId) {
    if (!userId) return;
    try {
        localStorage.removeItem(`user_profile_${userId}`);
        console.log(`✓ Cleared cached profile for user ${userId}`);
    } catch (error) {
        console.warn('Failed to clear cached profile:', error);
    }
}

// Truncate string helper
function truncateString(str, maxLength = 20) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

// Load user profile
async function loadUserProfile(user) {
    if (!supabaseClient || !user) return null;

    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('id, username, active_session_id')
            .eq('id', user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            // Try without active_session_id if column doesn't exist
            if (error.message && error.message.includes('active_session_id')) {
                const { data, error: err2 } = await supabaseClient
                    .from('profiles')
                    .select('id, username')
                    .eq('id', user.id)
                    .maybeSingle();

                if (err2) throw err2;
                return data;
            }
            throw error;
        }

        return profileData;
    } catch (error) {
        console.error('Error loading profile:', error);
        return null;
    }
}

// Update auth UI
function updateAuthUI(user) {
    if (!loginButton || !userStatusElement || !userNicknameElement) return;

    if (user) {
        // User is logged in
        let displayName = 'Loading...';
        if (currentUserProfile?.username) {
            displayName = currentUserProfile.username;
        } else {
            displayName = user.email || 'User';
        }

        userNicknameElement.textContent = truncateString(displayName);
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';

        // Update leaderboard to highlight user's score
        updateLeaderboard();
    } else {
        // User is logged out - hide both menu elements
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'none';
    }
}

// Login with Google
async function loginWithGoogle() {
    if (!supabaseClient) return;

    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/quiz.html'
            }
        });

        if (error) throw error;
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Logout
async function logout() {
    if (!supabaseClient) return;

    try {
        if (currentUser) {
            clearCachedProfile(currentUser.id);
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        currentUser = null;
        currentUserProfile = null;
        updateAuthUI(null);
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Setup auth
function setupAuth() {
    if (!supabaseClient) return;

    // Set up button handlers
    if (loginButton) {
        loginButton.addEventListener('click', loginWithGoogle);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Set up auth state listener
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log(`Auth event: ${event}`);
        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile immediately
            const cachedProfile = loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                console.log(`✓ Using cached profile: ${cachedProfile.username}`);
            }

            // Update UI immediately
            updateAuthUI(user);

            // Load fresh profile in background
            loadUserProfile(user).then(profile => {
                if (profile) {
                    currentUserProfile = profile;
                    cacheUserProfile(profile);
                    updateAuthUI(user);
                }
            });
        } else {
            if (event === 'SIGNED_OUT' && currentUser) {
                clearCachedProfile(currentUser.id);
            }
            currentUser = null;
            currentUserProfile = null;
            updateAuthUI(null);
        }
    });

    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile immediately
            const cachedProfile = loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
            }

            // Update UI immediately
            updateAuthUI(user);

            // Load fresh profile in background
            loadUserProfile(user).then(profile => {
                if (profile) {
                    currentUserProfile = profile;
                    cacheUserProfile(profile);
                    updateAuthUI(user);
                }
            });
        } else {
            updateAuthUI(null);
        }
    });
}
