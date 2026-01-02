// index-static.js - Auth functionality for static home page
// The featured sticker is pre-rendered, this only handles auth (non-blocking)

let supabaseClient;

// Initialize Supabase Client
if (typeof SharedUtils !== 'undefined') {
    supabaseClient = SharedUtils.initSupabaseClient();
    if (supabaseClient) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAuth);
        } else {
            initializeAuth();
        }
    }
}

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

// Setup button handlers
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
 * Initialize authentication (non-blocking)
 */
async function initializeAuth() {
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

        // Set up listener for future auth changes
        setupAuthStateListener();
    } catch (err) {
        console.error('Auth initialization error:', err);
        updateAuthUI(null);
    }
}

/**
 * Auth state listener
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
            return;
        }

        const user = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                SharedUtils.clearCachedProfile(currentUser.id);
            }
            currentUser = null;
            currentUserProfile = null;
            updateAuthUI(null);
            return;
        }

        if (event === 'SIGNED_IN' && user) {
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
