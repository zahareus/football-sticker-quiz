// index-script.js - Home page logic

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
            document.addEventListener('DOMContentLoaded', initializeHomePage);
        } else {
            initializeHomePage();
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        supabaseClient = null;
    }
}

// DOM Elements
let totalStickersElement;
let homeStickerImageElement;
let homeClubNameElement;
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

// Initialize home page
async function initializeHomePage() {
    console.log('Initializing home page...');

    // Get DOM elements
    totalStickersElement = document.getElementById('total-stickers');
    homeStickerImageElement = document.getElementById('home-sticker-image');
    homeClubNameElement = document.getElementById('home-club-name');
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

    // Set up auth
    setupAuth();

    // Set up nickname editing
    try {
        setupNicknameEditing();
    } catch (error) {
        console.error('Error setting up nickname editing:', error);
    }

    // Load data
    console.log('Loading home page data...');
    await loadTotalStickersCount();
    await loadRandomSticker();
    console.log('Home page data loaded');
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
        console.log(`Total stickers: ${count}`);
    } catch (error) {
        console.error('Error loading total stickers count:', error);
        totalStickersElement.textContent = 'N/A';
    }
}

// Function: Load random sticker
async function loadRandomSticker() {
    if (!supabaseClient || !homeStickerImageElement || !homeClubNameElement) return;

    showHomeLoading();

    try {
        // Get total count of stickers
        const { count, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        if (!count || count === 0) throw new Error('No stickers found');

        // Get random sticker
        const randomIndex = Math.floor(Math.random() * count);

        const { data: stickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`image_url, clubs ( name )`)
            .order('id', { ascending: true })
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw stickerError;
        if (!stickerData || !stickerData.clubs) throw new Error('Incomplete sticker data');

        // Preload image
        const img = new Image();
        img.onload = () => {
            homeStickerImageElement.src = stickerData.image_url;
            homeClubNameElement.textContent = stickerData.clubs.name;
            hideHomeLoading();
        };
        img.onerror = () => {
            throw new Error('Failed to load image');
        };
        img.src = stickerData.image_url;

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

// Load user profile and set currentUserProfile
async function loadAndSetUserProfile(user) {
    if (!supabaseClient || !user) return;

    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('id, username')
            .eq('id', user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
            return;
        }

        if (profileData) {
            currentUserProfile = profileData;
            cacheUserProfile(profileData);
            console.log(`✓ Profile loaded: ${profileData.username}`);
        } else {
            console.warn('No profile found for user');
        }
    } catch (error) {
        console.error('Error in loadAndSetUserProfile:', error);
    }
}

// Update auth UI
function updateAuthUI(user) {
    if (!loginButton || !userStatusElement || !userNicknameElement) return;

    if (user) {
        // User is logged in
        const displayName = currentUserProfile?.username || 'Loading...';
        userNicknameElement.textContent = truncateString(displayName);
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';
    } else {
        // User is logged out
        loginButton.style.display = 'block';
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

            // Load cached profile first
            const cachedProfile = loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                console.log(`✓ Using cached profile: ${cachedProfile.username}`);
                updateAuthUI(user);
            }

            // Load fresh profile and update UI
            await loadAndSetUserProfile(user);
            updateAuthUI(user);
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
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile first
            const cachedProfile = loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                console.log(`✓ Using cached profile`);
                updateAuthUI(user);
            }

            // Load fresh profile and update UI
            await loadAndSetUserProfile(user);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }
    });
}

// ========== NICKNAME EDITING FUNCTIONS ==========

function setupNicknameEditing() {
    if (!userNicknameElement) {
        console.error('userNicknameElement not found');
        return;
    }

    // Add click listener for nickname
    userNicknameElement.addEventListener('click', showNicknameEditForm);
    console.log('✓ Nickname click listener added');

    // Add form handlers
    if (editNicknameForm) {
        editNicknameForm.addEventListener('submit', handleNicknameSave);
    }
    if (cancelEditNicknameButton) {
        cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);
    }
}

function showNicknameEditForm() {
    console.log('showNicknameEditForm called');

    if (!currentUserProfile) {
        console.error('❌ Cannot edit nickname: profile not loaded yet');
        alert('Please wait for your profile to load...');
        return;
    }

    if (!editNicknameForm || !nicknameInputElement) {
        console.error('❌ Cannot edit nickname: form elements not found');
        return;
    }

    nicknameInputElement.value = currentUserProfile.username || '';
    editNicknameForm.style.display = 'block';
    nicknameInputElement.focus();
    nicknameInputElement.select();
    console.log('✓ Nickname edit form displayed');
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
    if (!newNickname || newNickname.length < 3 || newNickname.length > 25) {
        alert('Nickname must be 3-25 characters');
        return;
    }

    if (newNickname === currentUserProfile.username) {
        hideNicknameEditForm();
        return;
    }

    try {
        const { data: updatedData, error } = await supabaseClient
            .from('profiles')
            .update({ username: newNickname, updated_at: new Date() })
            .eq('id', currentUser.id)
            .select('username')
            .single();

        if (error) throw error;

        console.log('Nickname updated:', updatedData);
        currentUserProfile.username = updatedData.username;
        cacheUserProfile(currentUserProfile);

        if (userNicknameElement) {
            userNicknameElement.textContent = truncateString(updatedData.username);
        }

        hideNicknameEditForm();
        alert('Nickname updated successfully!');
    } catch (error) {
        console.error('Error updating nickname:', error);
        alert(`Update failed: ${error.message}`);
    }
}
