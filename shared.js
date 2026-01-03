// shared.js - Shared utilities and authentication module
// This module contains all common functions used across the application
// to eliminate code duplication and ensure consistency

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    SUPABASE_URL: "https://rbmeslzlbsolkxnvesqb.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw",

    // Cache settings
    PROFILE_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

    // Session validation interval
    SESSION_VALIDATION_INTERVAL: 10000, // 10 seconds

    // Game settings
    TIMER_DURATION: 10,
    TTR_TIMER_DURATION: 60,  // Time To Run mode: 60 seconds total
    LEADERBOARD_LIMIT: 10,

    // Game modes
    GAME_MODE_CLASSIC: 'classic',
    GAME_MODE_TTR: 'ttr',  // Time To Run mode

    // Nickname settings
    NICKNAME_MIN_LENGTH: 3,
    NICKNAME_MAX_LENGTH: 25,
    NICKNAME_DISPLAY_MAX_LENGTH: 12,

    // Nickname generation words
    NICKNAME_ADJECTIVES: ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"],
    NICKNAME_NOUNS: ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"],

    // Image optimization settings (Supabase Storage transformations)
    IMAGE_SIZES: {
        THUMBNAIL: { width: 150, height: 150 },   // Catalogue gallery preview
        QUIZ: { width: 400, height: 400 },         // Quiz game display
        DETAIL: { width: 600, height: 600 },       // Sticker detail view
        HOME: { width: 400, height: 400 }          // Home page featured sticker
    },
    IMAGE_QUALITY: 80  // WebP quality (20-100)
};

// ============================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================

let sharedSupabaseClient = null;

/**
 * Initialize and return the Supabase client
 * @returns {Object|null} Supabase client instance
 */
function initSupabaseClient() {
    if (sharedSupabaseClient) {
        return sharedSupabaseClient;
    }

    if (typeof supabase === 'undefined') {
        console.error('Error: Supabase client library not loaded.');
        return null;
    }

    try {
        sharedSupabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');
        return sharedSupabaseClient;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return null;
    }
}

/**
 * Get the current Supabase client instance
 * @returns {Object|null} Supabase client instance
 */
function getSupabaseClient() {
    return sharedSupabaseClient || initSupabaseClient();
}

// ============================================================
// STRING UTILITIES
// ============================================================

/**
 * Truncate a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length (default from CONFIG)
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength = CONFIG.NICKNAME_DISPLAY_MAX_LENGTH) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * Truncate long words in a text
 * @param {string} text - Text to process
 * @param {number} maxWordLength - Maximum word length (default 25)
 * @returns {string} Processed text
 */
function truncateLongWords(text, maxWordLength = 25) {
    if (!text) return text;
    const words = text.split(' ');
    const processedWords = words.map(word => {
        if (word.length > maxWordLength) {
            return word.substring(0, maxWordLength - 3) + '...';
        }
        return word;
    });
    return processedWords.join(' ');
}

/**
 * Generate a random nickname
 * @returns {string} Random nickname in format "Adjective Noun"
 */
function generateRandomNickname() {
    const adj = CONFIG.NICKNAME_ADJECTIVES[Math.floor(Math.random() * CONFIG.NICKNAME_ADJECTIVES.length)];
    const noun = CONFIG.NICKNAME_NOUNS[Math.floor(Math.random() * CONFIG.NICKNAME_NOUNS.length)];
    return `${adj} ${noun}`;
}

// ============================================================
// AMPLITUDE ANALYTICS INTEGRATION
// ============================================================

/**
 * Identify user in Amplitude when they sign in
 * @param {Object} user - Supabase user object
 * @param {Object} profile - User profile with nickname
 */
function identifyAmplitudeUser(user, profile = null) {
    if (typeof window.amplitude === 'undefined') {
        console.warn('Amplitude not loaded, skipping user identification');
        return;
    }

    try {
        console.log('🔍 Identifying user in Amplitude:', {
            userId: user.id,
            email: user.email,
            nickname: profile?.nickname || profile?.username || 'N/A'
        });

        // Set user ID (Supabase user ID)
        window.amplitude.setUserId(user.id);

        // Set user properties for better analytics
        const userProperties = {
            email: user.email,
            provider: user.app_metadata?.provider || 'unknown',
            created_at: user.created_at
        };

        // Add nickname if available
        if (profile && (profile.nickname || profile.username)) {
            userProperties.nickname = profile.nickname || profile.username;
        }

        window.amplitude.identify(new window.amplitude.Identify().set(userProperties));

        // Verify it was set
        const currentUserId = window.amplitude.getUserId();
        console.log('✅ Amplitude User ID set to:', currentUserId);

        if (currentUserId !== user.id) {
            console.error('❌ Amplitude User ID mismatch! Expected:', user.id, 'Got:', currentUserId);
        }
    } catch (error) {
        console.error('Error identifying user in Amplitude:', error);
    }
}

/**
 * Clear user identification in Amplitude when they sign out
 */
function clearAmplitudeUser() {
    if (typeof window.amplitude === 'undefined') {
        return;
    }

    try {
        window.amplitude.setUserId(null);
        window.amplitude.reset();
        console.log('Amplitude: User cleared');
    } catch (error) {
        console.error('Error clearing Amplitude user:', error);
    }
}

// ============================================================
// IMAGE OPTIMIZATION (Pre-generated WebP versions)
// ============================================================

/**
 * Convert original image URL to optimized WebP version URL
 * Replaces filename.ext with filename_suffix.webp
 *
 * @param {string} imageUrl - Original image URL
 * @param {string} suffix - Suffix to add (_web or _thumb)
 * @returns {string} URL to optimized WebP version
 */
function getOptimizedImageUrl(imageUrl, suffix = '_web') {
    if (!imageUrl) return imageUrl;

    // Check if URL is from Supabase Storage
    if (!imageUrl.includes('/storage/v1/object/')) {
        // Not a Supabase Storage URL, return as-is
        return imageUrl;
    }

    // Replace extension with suffix + .webp
    // Example: image.jpg -> image_web.webp
    // Example: path/to/image.png -> path/to/image_web.webp
    const url = new URL(imageUrl);
    const pathname = url.pathname;

    // Find the last dot for extension
    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex === -1) {
        // No extension found, just append
        url.pathname = pathname + suffix + '.webp';
    } else {
        // Replace extension
        url.pathname = pathname.substring(0, lastDotIndex) + suffix + '.webp';
    }

    return url.toString();
}

/**
 * Get optimized image URL for thumbnail/gallery preview (150x150)
 * @param {string} imageUrl - Original image URL
 * @returns {string} Optimized URL for thumbnails
 */
function getThumbnailUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_thumb');
}

/**
 * Get optimized image URL for quiz display (600x600)
 * @param {string} imageUrl - Original image URL
 * @returns {string} Optimized URL for quiz
 */
function getQuizImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

/**
 * Get optimized image URL for detail view (600x600)
 * @param {string} imageUrl - Original image URL
 * @returns {string} Optimized URL for detail view
 */
function getDetailImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

/**
 * Get optimized image URL for home page (600x600)
 * @param {string} imageUrl - Original image URL
 * @returns {string} Optimized URL for home page
 */
function getHomeImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Generate a unique session ID
 * @returns {string} Unique session ID
 */
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Get or create session ID for this browser
 * @returns {string} Session ID
 */
function getLocalSessionId() {
    let sessionId = localStorage.getItem('app_session_id');
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('app_session_id', sessionId);
    }
    return sessionId;
}

// ============================================================
// PROFILE CACHING
// ============================================================

/**
 * Cache user profile to localStorage
 * @param {Object} profile - Profile object with id and username
 */
function cacheUserProfile(profile) {
    if (!profile || !profile.id) return;
    try {
        const cacheData = {
            profile: profile,
            timestamp: Date.now()
        };
        localStorage.setItem(`user_profile_${profile.id}`, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to cache profile:', error);
    }
}

/**
 * Load cached profile from localStorage
 * @param {string} userId - User ID
 * @returns {Object|null} Cached profile or null if not found/expired
 */
function loadCachedProfile(userId) {
    if (!userId) return null;
    try {
        const cached = localStorage.getItem(`user_profile_${userId}`);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;

        if (age > CONFIG.PROFILE_CACHE_TTL) {
            localStorage.removeItem(`user_profile_${userId}`);
            return null;
        }

        return cacheData.profile;
    } catch (error) {
        console.warn('Failed to load cached profile:', error);
        return null;
    }
}

/**
 * Clear cached profile from localStorage
 * @param {string} userId - User ID
 */
function clearCachedProfile(userId) {
    if (!userId) return;
    try {
        localStorage.removeItem(`user_profile_${userId}`);
    } catch (error) {
        console.warn('Failed to clear cached profile:', error);
    }
}

// ============================================================
// DATE/TIME UTILITIES (Fixed timezone handling - always use UTC)
// ============================================================

/**
 * Calculate time range for leaderboard queries
 * Uses UTC consistently to avoid timezone issues
 * @param {string} timeframe - 'today', 'week', 'month', or 'all'
 * @returns {Object} Object with fromDate and toDate as ISO strings
 */
function calculateTimeRange(timeframe) {
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    switch (timeframe) {
        case 'today':
            // Start of today in UTC
            const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            // Start of next day in UTC
            const startOfNextDay = new Date(startOfDay);
            startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1);
            fromDate = startOfDay.toISOString();
            toDate = startOfNextDay.toISOString();
            break;
        case 'week':
            // 7 days ago in UTC
            const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
            fromDate = sevenDaysAgo.toISOString();
            break;
        case 'month':
            // 30 days ago in UTC
            const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
            fromDate = thirtyDaysAgo.toISOString();
            break;
        case 'all':
        default:
            fromDate = null;
            toDate = null;
            break;
    }

    return { fromDate, toDate };
}

/**
 * Get start and end of today in UTC
 * @returns {Object} Object with startOfDay and startOfNextDay as Date objects
 */
function getTodayRangeUTC() {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1);
    return { startOfDay, startOfNextDay };
}

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

/**
 * Login with Google OAuth
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} redirectPath - Path to redirect after login (default: '/quiz.html')
 * @returns {Promise<Object>} Result of login attempt
 */
async function loginWithGoogle(supabaseClient, redirectPath = '/quiz.html') {
    if (!supabaseClient) {
        return { error: { message: 'Client not initialized' } };
    }

    try {
        const redirectUrl = window.location.origin + redirectPath;
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Login error:', error);
        return { error };
    }
}

/**
 * Logout user
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} currentUserId - Current user ID for cache clearing
 * @returns {Promise<Object>} Result of logout attempt
 */
async function logout(supabaseClient, currentUserId) {
    if (!supabaseClient) {
        return { error: { message: 'Client not initialized' } };
    }

    try {
        // Clear cached profile first
        if (currentUserId) {
            clearCachedProfile(currentUserId);
        }

        // Try to sign out
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            // If session missing, that's OK
            if (error.message && (error.message.includes('session') || error.message.includes('Session'))) {
                console.log('Session already missing, clearing local state...');
            } else {
                throw error;
            }
        }

        // Clear all auth-related localStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('supabase') || key.includes('user_profile'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }

        return { error: null };
    } catch (error) {
        console.error('Logout error:', error);

        // Even if signOut failed, try to clear local state
        try {
            localStorage.clear();
        } catch (clearError) {
            console.warn('Failed to clear localStorage:', clearError);
        }

        return { error };
    }
}

/**
 * Load user profile from database
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Object} user - User object with id
 * @returns {Promise<Object|null>} Profile data or null
 */
async function loadUserProfile(supabaseClient, user) {
    if (!supabaseClient || !user) return null;

    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('id, username, active_session_id')
            .eq('id', user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            // If active_session_id column doesn't exist, try without it
            if (error.message && error.message.includes('active_session_id')) {
                const { data: basicProfile, error: basicError } = await supabaseClient
                    .from('profiles')
                    .select('id, username')
                    .eq('id', user.id)
                    .maybeSingle();

                if (basicError && basicError.code !== 'PGRST116') {
                    console.error('Error loading profile:', basicError);
                    return null;
                }
                return basicProfile;
            }
            console.error('Error loading profile:', error);
            return null;
        }

        return profileData;
    } catch (error) {
        console.error('Error in loadUserProfile:', error);
        return null;
    }
}

/**
 * Create new user profile
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Object} user - User object with id
 * @returns {Promise<Object|null>} Created profile or null
 */
async function createUserProfile(supabaseClient, user) {
    if (!supabaseClient || !user) return null;

    const randomNickname = generateRandomNickname();
    const localSessionId = getLocalSessionId();

    try {
        // Try with session management first
        let insertResult = await supabaseClient
            .from('profiles')
            .insert({
                id: user.id,
                username: randomNickname,
                active_session_id: localSessionId,
                updated_at: new Date()
            })
            .select('id, username, active_session_id')
            .single();

        // If column doesn't exist, create without it
        if (insertResult.error && insertResult.error.message && insertResult.error.message.includes('active_session_id')) {
            insertResult = await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    username: randomNickname,
                    updated_at: new Date()
                })
                .select('id, username')
                .single();
        }

        if (insertResult.error) {
            throw insertResult.error;
        }

        return insertResult.data;
    } catch (error) {
        console.error('Error creating profile:', error);
        return null;
    }
}

/**
 * Update user nickname
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} userId - User ID
 * @param {string} newNickname - New nickname
 * @returns {Promise<Object>} Result with data or error
 */
async function updateNickname(supabaseClient, userId, newNickname) {
    if (!supabaseClient || !userId) {
        return { data: null, error: { message: 'Invalid parameters' } };
    }

    // Validate nickname
    const trimmedNickname = newNickname.trim();
    if (!trimmedNickname ||
        trimmedNickname.length < CONFIG.NICKNAME_MIN_LENGTH ||
        trimmedNickname.length > CONFIG.NICKNAME_MAX_LENGTH) {
        return {
            data: null,
            error: { message: `Nickname must be ${CONFIG.NICKNAME_MIN_LENGTH}-${CONFIG.NICKNAME_MAX_LENGTH} characters` }
        };
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .update({ username: trimmedNickname, updated_at: new Date() })
            .eq('id', userId)
            .select('username')
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        console.error('Error updating nickname:', error);
        return { data: null, error };
    }
}

/**
 * Validate current session (check if user logged in elsewhere)
 * @param {Object} supabaseClient - Supabase client instance
 * @param {string} userId - User ID
 * @param {Object} currentProfile - Current user profile
 * @returns {Promise<boolean>} True if session is valid
 */
async function validateSession(supabaseClient, userId, currentProfile) {
    if (!supabaseClient || !userId || !currentProfile) {
        return true; // No session to validate
    }

    // Only validate if session management is available
    if (!('active_session_id' in currentProfile)) {
        return true;
    }

    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('active_session_id')
            .eq('id', userId)
            .single();

        if (error) {
            if (error.message && error.message.includes('active_session_id')) {
                return true;
            }
            console.error("Session validation error:", error);
            return true; // Don't log out on error
        }

        const localSessionId = getLocalSessionId();

        if (profileData.active_session_id && profileData.active_session_id !== localSessionId) {
            console.warn('Session invalidated - user logged in elsewhere');
            return false;
        }

        return true;
    } catch (error) {
        console.error("Session validation error:", error);
        return true; // Don't log out on error
    }
}

// ============================================================
// SESSION VALIDATION MANAGER (Fixes memory leak)
// ============================================================

let sessionValidationIntervalId = null;

/**
 * Start periodic session validation
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Function} getCurrentUser - Function to get current user
 * @param {Function} getCurrentProfile - Function to get current profile
 * @param {Function} onInvalidSession - Callback when session is invalid
 */
function startSessionValidation(supabaseClient, getCurrentUser, getCurrentProfile, onInvalidSession) {
    // Clear any existing interval first (prevents memory leak)
    stopSessionValidation();

    sessionValidationIntervalId = setInterval(async () => {
        const user = getCurrentUser();
        const profile = getCurrentProfile();

        if (user && profile) {
            const isValid = await validateSession(supabaseClient, user.id, profile);
            if (!isValid && onInvalidSession) {
                onInvalidSession();
            }
        }
    }, CONFIG.SESSION_VALIDATION_INTERVAL);
}

/**
 * Stop periodic session validation (call on logout or page unload)
 */
function stopSessionValidation() {
    if (sessionValidationIntervalId !== null) {
        clearInterval(sessionValidationIntervalId);
        sessionValidationIntervalId = null;
    }
}

// ============================================================
// UI HELPERS
// ============================================================

/**
 * Update auth UI elements
 * @param {Object} elements - Object containing DOM elements
 * @param {Object} user - Current user or null
 * @param {Object} profile - Current user profile or null
 */
function updateAuthUI(elements, user, profile) {
    const { loginButton, userStatusElement, userNicknameElement } = elements;

    if (!loginButton || !userStatusElement || !userNicknameElement) return;

    if (user) {
        const displayName = profile?.username || 'Loading...';
        userNicknameElement.textContent = truncateString(displayName);
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';
    } else {
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'none';
    }
}

// ============================================================
// EXPORTS (for module usage)
// ============================================================

// Make functions available globally for non-module scripts
window.SharedUtils = {
    // Configuration
    CONFIG,

    // Supabase
    initSupabaseClient,
    getSupabaseClient,

    // String utilities
    truncateString,
    truncateLongWords,
    generateRandomNickname,

    // Amplitude Analytics
    identifyAmplitudeUser,
    clearAmplitudeUser,

    // Session management
    generateSessionId,
    getLocalSessionId,

    // Profile caching
    cacheUserProfile,
    loadCachedProfile,
    clearCachedProfile,

    // Date/Time utilities
    calculateTimeRange,
    getTodayRangeUTC,

    // Authentication
    loginWithGoogle,
    logout,
    loadUserProfile,
    createUserProfile,
    updateNickname,
    validateSession,

    // Session validation manager
    startSessionValidation,
    stopSessionValidation,

    // UI helpers
    updateAuthUI,

    // Image optimization
    getOptimizedImageUrl,
    getThumbnailUrl,
    getQuizImageUrl,
    getDetailImageUrl,
    getHomeImageUrl
};
