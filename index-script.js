// index-script.js - Home page logic (optimized)
// Uses SharedUtils from shared.js for common functionality

let supabaseClient;

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before index-script.js');
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
    if (supabaseClient) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeHomePage);
        } else {
            initializeHomePage();
        }
    }
}

// DOM Elements
let totalStickersElement;
let homeStickerImageElement;

// Auth DOM Elements
let loginButton;
let logoutButton;
let userStatusElement;
let userNicknameElement;
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Auth State
let currentUser = null;
let currentUserProfile = null;

// Initialize home page
async function initializeHomePage() {
    // Get DOM elements
    totalStickersElement = document.getElementById('total-stickers');
    homeStickerImageElement = document.getElementById('home-sticker-image');

    // Get auth DOM elements
    loginButton = document.getElementById('login-button');
    logoutButton = document.getElementById('logout-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Set up button handlers
    setupButtonHandlers();

    // Set up nickname editing
    setupNicknameEditing();

    // OPTIMIZED: Single query for both count and random sticker
    // Auth loads in background without blocking sticker display
    loadRandomStickerOptimized();
    initializeAuth();
}

// OPTIMIZED: Single function that gets count + random sticker in minimal queries
async function loadRandomStickerOptimized() {
    if (!supabaseClient) return;

    try {
        // Single query: get count + one random sticker
        // Using count: 'exact' with limit 1 and random offset
        const { count, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        if (!count || count === 0) throw new Error('No stickers found');

        // Update count display immediately
        if (totalStickersElement) {
            totalStickersElement.textContent = count;
        }

        // Get random sticker in parallel-optimized way
        const randomIndex = Math.floor(Math.random() * count);

        const { data: stickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select('image_url')
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw stickerError;
        if (!stickerData || !homeStickerImageElement) return;

        // Use optimized WebP URL and set directly (browser handles caching)
        const optimizedImageUrl = SharedUtils.getHomeImageUrl(stickerData.image_url);
        homeStickerImageElement.src = optimizedImageUrl;

    } catch (error) {
        console.error('Error loading sticker:', error);
        if (totalStickersElement) {
            totalStickersElement.textContent = 'N/A';
        }
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
        const displayName = currentUserProfile?.username || 'Loading...';
        userNicknameElement.textContent = SharedUtils.truncateString(displayName);
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';
    } else {
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

// Setup button handlers (separate from auth initialization)
function setupButtonHandlers() {
    if (!supabaseClient) return;

    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
    }
}

/**
 * Initialize authentication (non-blocking for home page)
 * Uses cached profile for instant UI, loads fresh data in background
 */
async function initializeAuth() {
    if (!supabaseClient) return;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            updateAuthUI(null);
            return;
        }

        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile first for instant UI
            const cachedProfile = SharedUtils.loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
            }
            updateAuthUI(user);

            // Load fresh profile in background
            loadAndSetUserProfile(user).then(() => {
                updateAuthUI(user);
            });
        } else {
            updateAuthUI(null);
        }

        // Set up listener for future auth changes (logout, etc.)
        setupAuthStateListener();
    } catch (err) {
        console.error('Auth initialization error:', err);
        updateAuthUI(null);
    }
}

/**
 * Auth state listener - only for FUTURE changes after initial load
 * Ignores INITIAL_SESSION to prevent double-processing
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: Skip INITIAL_SESSION - we already handled it in initializeAuth()
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

        // Handle new sign in (e.g., from another tab, or token refresh)
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
    if (!userNicknameElement) return;

    userNicknameElement.addEventListener('click', showNicknameEditForm);

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

    if (!editNicknameForm || !nicknameInputElement) return;

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
        alert('Nickname updated successfully!');
    }
}
