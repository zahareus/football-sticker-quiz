// index-script.js - Home page logic
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
let homeLoadingIndicator;
let homeErrorMessage;

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

// Flag to track if initial auth is complete
let authInitialized = false;

// Initialize home page
async function initializeHomePage() {
    // Get DOM elements
    totalStickersElement = document.getElementById('total-stickers');
    homeStickerImageElement = document.getElementById('home-sticker-image');
    homeLoadingIndicator = document.getElementById('home-loading-indicator');
    homeErrorMessage = document.getElementById('home-error-message');

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

    // Load sticker and auth in PARALLEL for fastest image display
    // Sticker loading doesn't require auth, so we can start it immediately
    await Promise.all([
        loadRandomSticker(),
        initializeAuth(),
        loadTotalStickersCount()
    ]);
}

// Function: Load total stickers count
async function loadTotalStickersCount() {
    if (!supabaseClient || !totalStickersElement) return;

    try {
        const { count, error } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        totalStickersElement.textContent = count || '0';
    } catch (error) {
        console.error('Error loading total stickers count:', error);
        totalStickersElement.textContent = 'N/A';
    }
}

// Helper: Preload and decode image for smooth display
async function preloadAndDecodeImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            try {
                // Use decode() for smoother rendering
                if (img.decode) {
                    await img.decode();
                }
                resolve(img);
            } catch (e) {
                // Decode failed but image loaded - still usable
                resolve(img);
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = imageUrl;
    });
}

// Function: Load random sticker
async function loadRandomSticker() {
    if (!supabaseClient || !homeStickerImageElement) return;

    showHomeLoading();
    hideHomeError();

    try {
        const { count, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        if (!count || count === 0) throw new Error('No stickers found');

        const randomIndex = Math.floor(Math.random() * count);

        const { data: stickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`image_url`)
            .order('id', { ascending: true })
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw stickerError;
        if (!stickerData) throw new Error('No sticker data');

        // Use optimized image URL for faster loading
        const optimizedImageUrl = SharedUtils.getHomeImageUrl(stickerData.image_url);

        // Preload and decode image for smooth display
        try {
            await preloadAndDecodeImage(optimizedImageUrl);
        } catch (imgError) {
            console.warn('Image preload failed:', imgError);
            // Continue anyway - browser may still load it
        }

        // Image is now decoded in cache - this will display instantly
        homeStickerImageElement.src = optimizedImageUrl;
        hideHomeLoading();

    } catch (error) {
        console.error('Error loading random sticker:', error);
        showHomeError('Failed to load sticker. Please refresh the page.');
        hideHomeLoading();
    }
}

// Helper: Show loading
function showHomeLoading() {
    if (homeLoadingIndicator) homeLoadingIndicator.style.display = 'block';
}

// Helper: Hide loading
function hideHomeLoading() {
    if (homeLoadingIndicator) homeLoadingIndicator.style.display = 'none';
}

// Helper: Show error
function showHomeError(message) {
    if (homeErrorMessage) {
        homeErrorMessage.textContent = message;
        homeErrorMessage.style.display = 'block';
    }
}

// Helper: Hide error
function hideHomeError() {
    if (homeErrorMessage) {
        homeErrorMessage.style.display = 'none';
        homeErrorMessage.textContent = '';
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
 * Initialize authentication - MUST be awaited before loading data
 * This is the KEY FIX for mobile: we use getSession() first, then set up listener
 * for future changes. We ignore INITIAL_SESSION to avoid double-processing.
 *
 * The problem on mobile was:
 * 1. setupAuth() was not awaited
 * 2. Data loading started before auth was ready
 * 3. Supabase session might not be fully established after OAuth redirect
 *
 * This fix ensures auth is FULLY ready before any data is loaded.
 */
async function initializeAuth() {
    if (!supabaseClient) return;

    return new Promise((resolve) => {
        // Step 1: Get current session FIRST (this is synchronous with stored session)
        supabaseClient.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                console.error('Error getting session:', error);
                updateAuthUI(null);
                authInitialized = true;
                resolve();
                return;
            }

            const user = session?.user ?? null;

            if (user) {
                currentUser = user;

                // Load cached profile first for fast UI
                const cachedProfile = SharedUtils.loadCachedProfile(user.id);
                if (cachedProfile) {
                    currentUserProfile = cachedProfile;
                }
                updateAuthUI(user);

                // Load fresh profile (don't await - let it update in background)
                loadAndSetUserProfile(user).then(() => {
                    updateAuthUI(user);
                });
            } else {
                updateAuthUI(null);
            }

            // Step 2: Set up listener for FUTURE auth changes only (logout, etc.)
            // We ignore INITIAL_SESSION because we already processed it above
            setupAuthStateListener();

            authInitialized = true;
            resolve();
        });
    });
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
