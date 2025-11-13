const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

let supabaseClient;

// ----- 2. Initialize Supabase Client -----
if (typeof supabase === 'undefined') {
    console.error('Error: Supabase client library not loaded.');
    handleCriticalError('Error loading game. Please refresh the page.');
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');
        checkInitialAuthState();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        handleCriticalError('Error connecting to the game. Please refresh the page.');
        supabaseClient = null;
    }
}

// ----- 3. Global Game State Variables -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;
let currentUser = null;
let selectedDifficulty = 1;
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;
let currentUserProfile = null;
let allClubNames = [];
let clubNamesLoaded = false;
let preloadingPromise = null;
let stickerCountCache = {}; // Cache for sticker counts per difficulty
let nextQuestionPromise = null; // Promise for the next preloaded question

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, resultSignInButton, authSectionElement, loginButton, userStatusElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton;
let userNicknameElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton;
let scoreDisplayElement;
let landingPageElement, landingLoginButton, landingLeaderboardButton, landingPlayEasyButton;
let introTextElement;
let rankContainerElement;
let playerStatsElement, playersTotalElement, playersTodayElement;

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

// Helper function to truncate strings
function truncateString(str, num = 12) { if (!str) return ''; if (str.length <= num) { return str; } return str.slice(0, num) + '...'; }

// Flag to track if event listeners have been added
let eventListenersAdded = false;

// Initialize DOM Elements
function initializeDOMElements(isRetry = false) {
    console.log(`initializeDOMElements called (isRetry: ${isRetry})`);

    gameAreaElement = document.getElementById('game-area'); stickerImageElement = document.getElementById('sticker-image'); optionsContainerElement = document.getElementById('options'); timeLeftElement = document.getElementById('time-left'); currentScoreElement = document.getElementById('current-score'); scoreDisplayElement = document.getElementById('score'); resultAreaElement = document.getElementById('result-area'); finalScoreElement = document.getElementById('final-score'); rankContainerElement = document.getElementById('rank-container'); playAgainButton = document.getElementById('play-again'); resultSignInButton = document.getElementById('result-sign-in-button'); authSectionElement = document.getElementById('auth-section'); loginButton = document.getElementById('login-button'); userStatusElement = document.getElementById('user-status'); userNicknameElement = document.getElementById('user-nickname'); logoutButton = document.getElementById('logout-button'); difficultySelectionElement = document.getElementById('difficulty-selection'); loadingIndicator = document.getElementById('loading-indicator'); errorMessageElement = document.getElementById('error-message'); difficultyButtons = document.querySelectorAll('.difficulty-option .difficulty-button'); leaderboardSectionElement = document.getElementById('leaderboard-section'); leaderboardListElement = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button'); leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter'); leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter'); editNicknameForm = document.getElementById('edit-nickname-form'); nicknameInputElement = document.getElementById('nickname-input'); cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button'); landingPageElement = document.getElementById('landing-page'); landingLoginButton = document.getElementById('landing-login-button'); landingLeaderboardButton = document.getElementById('landing-leaderboard-button'); landingPlayEasyButton = document.getElementById('landing-play-easy-button'); introTextElement = document.getElementById('intro-text-element'); playerStatsElement = document.getElementById('player-stats-element'); playersTotalElement = document.getElementById('players-total'); playersTodayElement = document.getElementById('players-today');

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, scoreDisplayElement, resultAreaElement, finalScoreElement, playAgainButton, resultSignInButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, loadingIndicator, errorMessageElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton, landingPageElement, landingLoginButton, landingLeaderboardButton, landingPlayEasyButton, introTextElement };

    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
            const idName = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('-element', '').replace('-button', '').replace('-display', '');
            console.error(`Error: Could not find DOM element with expected ID near '${idName}'! Check HTML.`);
            allFound = false;
        }
    }

    if (!difficultyButtons || difficultyButtons.length !== 3) {
        console.error(`Error: Found ${difficultyButtons?.length || 0} difficulty buttons, expected 3! Check selector '.difficulty-option .difficulty-button'.`);
        allFound = false;
    }

    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) {
        console.error("Error: Could not find leaderboard time filter buttons!");
        allFound = false;
    }

    if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) {
        console.error("Error: Could not find leaderboard difficulty filter buttons!");
        allFound = false;
    }

    if (!allFound) {
        console.error("initializeDOMElements: Not all required elements found.");

        // Only show critical error on initial load, not on retries
        if (!isRetry) {
            handleCriticalError("UI Error: Missing page elements.");
        }
        return false;
    }

    // --- Add Event Listeners (only once) ---
    if (!eventListenersAdded) {
        console.log("Adding event listeners...");
        playAgainButton.addEventListener('click', showDifficultySelection);
        loginButton.addEventListener('click', loginWithGoogle);
        landingLoginButton.addEventListener('click', loginWithGoogle);
        if (resultSignInButton) resultSignInButton.addEventListener('click', loginWithGoogle);
        logoutButton.addEventListener('click', logout);
        difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
        if (landingLeaderboardButton) landingLeaderboardButton.addEventListener('click', openLeaderboard);
        if (landingPlayEasyButton) landingPlayEasyButton.addEventListener('click', startEasyGame);
        closeLeaderboardButton.addEventListener('click', closeLeaderboard);
        leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
        leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });

        // Add click listener for nickname editing
        if (userNicknameElement) {
            userNicknameElement.addEventListener('click', showNicknameEditForm);
            console.log('✓ Nickname click listener added');
        } else {
            console.error('❌ userNicknameElement not found, cannot add click listener');
        }

        editNicknameForm.addEventListener('submit', handleNicknameSave);
        cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);

        // --- Animation End Listeners ---
        if (scoreDisplayElement) { scoreDisplayElement.addEventListener('animationend', () => { scoreDisplayElement.classList.remove('score-updated'); }); }
        if (finalScoreElement) { finalScoreElement.addEventListener('animationend', () => { finalScoreElement.classList.remove('final-score-animated'); }); }
        if (stickerImageElement) { stickerImageElement.addEventListener('animationend', (event) => { if (event.animationName === 'fadeIn') { stickerImageElement.classList.remove('fade-in'); } }); }
        // --- Listener for Timer Tick Animation ---
        if (timeLeftElement) {
            timeLeftElement.addEventListener('animationend', (event) => {
                if (event.animationName === 'timer-tick') {
                    timeLeftElement.classList.remove('timer-tick-animation');
                }
            });
        }

        eventListenersAdded = true;
        console.log("Event listeners added");
    } else {
        console.log("Event listeners already added, skipping");
    }
    // --------------------------------------

    console.log("DOM elements initialized successfully");
    return true;
}

// --- Function: Load All Club Names ---
async function loadAllClubNames() { if (clubNamesLoaded) { console.log("Club names loaded."); return true; } if (!supabaseClient) { return false; } console.log("Loading all club names..."); try { const { data, error } = await supabaseClient.from('clubs').select('name'); if (error) { throw error; } if (data) { allClubNames = data.map(club => club.name); clubNamesLoaded = true; console.log(`Loaded ${allClubNames.length} club names.`); return true; } else { throw new Error("No data for club names."); } } catch (error) { console.error("Error loading club names:", error); clubNamesLoaded = false; allClubNames = []; return false; } }

// --- Function: Load Player Statistics ---
async function loadPlayerStatistics() {
    if (!supabaseClient || !playerStatsElement || !playersTotalElement || !playersTodayElement) {
        return;
    }

    try {
        // Get total games count from scores table (1 game = 1 player)
        const { count: totalGames, error: totalError } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Get games from last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

        const { count: todayGames, error: todayError } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgoISO);

        if (todayError) throw todayError;

        playersTotalElement.textContent = totalGames || 0;
        playersTodayElement.textContent = todayGames || 0;

        console.log(`Player stats loaded: ${totalGames || 0} total, ${todayGames || 0} today`);
    } catch (error) {
        console.error('Error loading player statistics:', error);
        playersTotalElement.textContent = '-';
        playersTodayElement.textContent = '-';
    }
}

// --- Function: Get Cached Sticker Count ---
async function getStickerCount(difficulty) {
    if (stickerCountCache[difficulty]) {
        console.log(`Using cached count for difficulty ${difficulty}: ${stickerCountCache[difficulty]}`);
        return stickerCountCache[difficulty];
    }

    console.log(`Fetching sticker count for difficulty ${difficulty}...`);
    const { count, error } = await supabaseClient
        .from('stickers')
        .select('*', { count: 'exact', head: true })
        .eq('difficulty', difficulty);

    if (error) {
        throw new Error(`Sticker count error: ${error.message}`);
    }

    if (count === null || count === 0) {
        throw new Error(`No stickers for difficulty ${difficulty}.`);
    }

    stickerCountCache[difficulty] = count;
    console.log(`Cached sticker count for difficulty ${difficulty}: ${count}`);
    return count;
}

// ----- 5. Authentication Functions -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Client error.");

    hideError();
    showLoading();

    try {
        // Always redirect to quiz.html after OAuth
        // This is the consistent redirect point for all auth flows
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/quiz.html`;

        console.log(`OAuth redirect URL: ${redirectUrl}`);
        console.log(`User will be redirected to quiz page after authentication`);

        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) throw error;

        console.log("OAuth redirect initiated...");
    } catch (error) {
        console.error("Login error:", error);
        showError(`Login failed: ${error.message}`);
        hideLoading();
    }
}
async function logout() {
    if (!supabaseClient) {
        return showError("Client error.");
    }

    console.log("Signing out...");
    hideError();
    showLoading();

    try {
        // Clear cached profile first
        if (currentUser) {
            const userId = currentUser.id;
            try {
                localStorage.removeItem(`user_profile_${userId}`);
                console.log(`✓ Cleared cached profile for user ${userId}`);
            } catch (e) {
                console.warn('Failed to clear cached profile:', e);
            }
        }

        // Try to sign out, but don't fail if session is already missing
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            // If session missing, that's OK - just log it and continue
            if (error.message.includes('session') || error.message.includes('Session')) {
                console.log('⚠️ Session already missing, clearing local state...');
            } else {
                throw error;
            }
        }

        console.log("✓ SignOut successful, reloading page...");

        // Reload page to reset all state
        window.location.reload();
    } catch (error) {
        console.error("Logout error:", error);

        // Even if signOut failed, try to clear local state and reload
        console.log("Attempting to clear local state and reload anyway...");
        try {
            localStorage.clear();
            window.location.reload();
        } catch (reloadError) {
            console.error("Failed to reload:", reloadError);
            showError(`Logout failed: ${error.message || 'Unknown'}`);
        }
    } finally {
        hideLoading();
    }
}

function updateAuthStateUI(user) {
    console.log(`========== updateAuthStateUI START ==========`);
    console.log(`User: ${user ? user.id : 'null'}`);
    console.log(`currentUserProfile: ${currentUserProfile ? currentUserProfile.username : 'null'}`);

    // Force re-initialize if elements missing
    if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !landingPageElement || !introTextElement) {
        console.error("CRITICAL: UI elements not found! Re-initializing...");
        initializeDOMElements(true);
    }

    // Double check after re-init
    if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !landingPageElement || !introTextElement) {
        console.error("CRITICAL ERROR: Elements still missing after re-init!");
        console.error({
            loginButton: !!loginButton,
            userStatusElement: !!userStatusElement,
            difficultySelectionElement: !!difficultySelectionElement,
            userNicknameElement: !!userNicknameElement,
            landingPageElement: !!landingPageElement,
            introTextElement: !!introTextElement
        });
        return;
    }

    console.log("All elements found, proceeding...");

    const bodyElement = document.body;
    hideNicknameEditForm();
    hideLoading();

    // Hide ALL sections first using !important
    console.log("Hiding all sections with !important...");
    difficultySelectionElement.style.cssText = 'display: none !important;';
    gameAreaElement.style.cssText = 'display: none !important;';
    resultAreaElement.style.cssText = 'display: none !important;';
    leaderboardSectionElement.style.cssText = 'display: none !important;';
    landingPageElement.style.cssText = 'display: none !important;';
    introTextElement.style.cssText = 'display: none !important;';
    if (playerStatsElement) playerStatsElement.style.cssText = 'display: none !important;';

    if (user) {
        console.log("==== USER IS LOGGED IN ====");
        bodyElement.classList.remove('logged-out');

        // Show appropriate display name - prioritize username
        let displayName = 'Loading...';
        if (currentUserProfile?.username) {
            displayName = currentUserProfile.username;
            console.log(`✓ Showing username: ${displayName}`);
        } else if (!currentUserProfile) {
            // Profile not loaded yet, show loading
            displayName = 'Loading...';
            console.log(`⚠️ Profile loading, showing temporary state`);
        } else {
            // Profile exists but no username (shouldn't happen, but fallback)
            displayName = 'Loading...';
            console.log(`⚠️ Profile exists but no username`);
        }

        userNicknameElement.textContent = truncateString(displayName);
        userStatusElement.style.cssText = 'display: flex !important;';
        loginButton.style.cssText = 'display: none !important;';

        console.log(`Setting user status display to flex with !important`);
        console.log(`User nickname set to: ${displayName}`);

        // Show difficulty selection elements with !important to force visibility
        console.log("Showing difficulty selection elements with !important...");
        difficultySelectionElement.style.cssText = 'display: block !important;';
        introTextElement.style.cssText = 'display: block !important;';
        if (playerStatsElement) {
            playerStatsElement.style.cssText = 'display: block !important;';
            loadPlayerStatistics();
        }

        // Verify elements are actually visible
        // Force element visibility verification
        const diffStyle = window.getComputedStyle(difficultySelectionElement);
        const introStyle = window.getComputedStyle(introTextElement);
        const userStyle = window.getComputedStyle(userStatusElement);

        console.log(`✓ difficultySelectionElement display: ${diffStyle.display}`);
        console.log(`✓ introTextElement display: ${introStyle.display}`);
        console.log(`✓ userStatusElement display: ${userStyle.display}`);

        // If elements are still hidden, force them visible again
        if (diffStyle.display === 'none') {
            console.warn('⚠️ difficultySelection still hidden, forcing visible again');
            difficultySelectionElement.style.setProperty('display', 'block', 'important');
        }
        if (introStyle.display === 'none') {
            console.warn('⚠️ introText still hidden, forcing visible again');
            introTextElement.style.setProperty('display', 'block', 'important');
        }
        if (userStyle.display === 'none' || userStyle.display === 'inline') {
            console.warn('⚠️ userStatus display issue, forcing flex');
            userStatusElement.style.setProperty('display', 'flex', 'important');
        }

        console.log(`✅ LOGGED IN USER UI CONFIGURED`);
    } else {
        console.log("==== USER IS LOGGED OUT ====");
        bodyElement.classList.add('logged-out');
        currentUser = null;
        currentUserProfile = null;

        loginButton.style.cssText = 'display: none !important;';
        userStatusElement.style.cssText = 'display: none !important;';
        stopTimer();

        // Show landing page with !important
        console.log("Showing landing page with !important...");
        landingPageElement.style.cssText = 'display: flex !important;';
        introTextElement.style.cssText = 'display: block !important;';
        if (playerStatsElement) {
            playerStatsElement.style.cssText = 'display: block !important;';
            loadPlayerStatistics();
        }

        console.log(`✓ landingPageElement computed display: ${window.getComputedStyle(landingPageElement).display}`);
        console.log(`✓ introTextElement computed display: ${window.getComputedStyle(introTextElement).display}`);
    }

    console.log(`========== updateAuthStateUI END ==========`);
}
function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }
// Generate a unique session ID for this browser/tab
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Get or create session ID for this browser
function getLocalSessionId() {
    let sessionId = localStorage.getItem('app_session_id');
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('app_session_id', sessionId);
        console.log(`Generated new local session ID: ${sessionId}`);
    }
    return sessionId;
}

// Cache profile to localStorage for instant loading
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

async function checkAndCreateUserProfile(user, skipCache = false) {
    if (!supabaseClient || !user) { return null; }
    console.log(`Checking profile for ${user.id}...`);

    let finalUsernameToShow = user.email || 'User';
    let fetchedProfile = null;

    try {
        console.log("Fetching profile...");

        // Try to fetch with session_id column, but handle if it doesn't exist
        const { data: profileData, error: selectError } = await supabaseClient
            .from('profiles')
            .select('id, username, active_session_id')
            .eq('id', user.id)
            .maybeSingle();

        // If column doesn't exist, fetch without it
        if (selectError && selectError.message && selectError.message.includes('active_session_id')) {
            console.warn("⚠️ active_session_id column not found, session management disabled");
            console.log("Fetching profile without session management...");

            const { data: basicProfile, error: basicError } = await supabaseClient
                .from('profiles')
                .select('id, username')
                .eq('id', user.id)
                .maybeSingle();

            if (basicError && basicError.code !== 'PGRST116') {
                throw basicError;
            }

            profileData = basicProfile;
            selectError = null;
        } else if (selectError && selectError.code !== 'PGRST116') {
            throw selectError;
        }

        console.log("Profile fetch result:", profileData);

        if (!profileData) {
            // Create new profile
            console.log(`Creating profile...`);
            const randomNickname = generateRandomNickname();

            // Try with session management first
            let insertResult = await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    username: randomNickname,
                    active_session_id: getLocalSessionId(),
                    updated_at: new Date()
                })
                .select('id, username, active_session_id')
                .single();

            // If column doesn't exist, create without it
            if (insertResult.error && insertResult.error.message && insertResult.error.message.includes('active_session_id')) {
                console.warn("⚠️ Creating profile without session management");
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

            fetchedProfile = insertResult.data;
            finalUsernameToShow = insertResult.data?.username || finalUsernameToShow;
            console.log(`✓ Profile created: ${finalUsernameToShow}`);
        } else {
            fetchedProfile = profileData;
            finalUsernameToShow = profileData.username || finalUsernameToShow;

            // Only handle session management if column exists
            if ('active_session_id' in profileData) {
                const localSessionId = getLocalSessionId();
                console.log(`🔐 SESSION MANAGEMENT CHECK:`);
                console.log(`   Local session ID: ${localSessionId}`);
                console.log(`   Database session ID: ${profileData.active_session_id || 'none'}`);

                // ALWAYS update to current session on login (force logout other devices)
                if (!profileData.active_session_id || profileData.active_session_id !== localSessionId) {
                    if (profileData.active_session_id && profileData.active_session_id !== localSessionId) {
                        console.warn(`⚠️ Different session detected in DB - force logout other devices`);
                        console.warn(`   Old session: ${profileData.active_session_id}`);
                        console.warn(`   New session: ${localSessionId}`);
                    } else {
                        console.log(`📝 Adding session tracking to profile`);
                    }

                    // Update to make this the active session (force logout other devices)
                    const { error: updateError } = await supabaseClient
                        .from('profiles')
                        .update({
                            active_session_id: localSessionId,
                            updated_at: new Date()
                        })
                        .eq('id', user.id);

                    if (updateError) {
                        console.error("❌ Failed to update session:", updateError);
                    } else {
                        console.log(`✅ Session updated successfully`);
                        console.log(`   Active session is now: ${localSessionId}`);
                        console.log(`   ⚠️ All other devices with old session will be logged out`);
                        fetchedProfile.active_session_id = localSessionId;
                    }
                } else {
                    console.log(`✓ Session already active on this device`);
                }
            } else {
                console.log(`ℹ️ Profile exists (session management not available in DB)`);
            }
        }

        // Only update currentUserProfile if we successfully fetched one
        // Don't overwrite existing cached profile with null
        if (fetchedProfile) {
            currentUserProfile = fetchedProfile;

            // Cache profile for instant loading next time
            cacheUserProfile(fetchedProfile);
        } else if (!currentUserProfile) {
            // Only set to null if there was no cached profile
            currentUserProfile = null;
        } else {
            console.log('⚠️ Profile fetch returned null, keeping cached profile');
        }

        return finalUsernameToShow;
    } catch (error) {
        console.error("checkAndCreateUserProfile error:", error);

        // Only show error for actual failures, not network slowness
        // On slow networks, the UI will still work with cached data or "Loading..." state
        if (error.code && error.code !== 'ETIMEDOUT' && error.code !== 'ECONNABORTED') {
            showError(`Profile Error: ${error.message || 'Load failed'}`);
        } else {
            console.warn('Profile fetch slow/failed, continuing with cached data or loading state');
        }

        // DON'T clear currentUserProfile if it already exists (from cache)
        // This prevents "Loading..." from appearing when there's a network error
        if (!currentUserProfile) {
            console.log('⚠️ No cached profile, returning email as fallback');
        } else {
            console.log(`✓ Keeping cached profile: ${currentUserProfile.username}`);
        }

        return user.email || 'User';
    }
}

// Check if current session is still valid (not logged in elsewhere)
async function validateSession() {
    if (!currentUser || !currentUserProfile || !supabaseClient) {
        return true; // No session to validate
    }

    // Only validate if session management is available
    if (!('active_session_id' in currentUserProfile)) {
        return true; // Session management not available, skip validation
    }

    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('active_session_id')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            // If column doesn't exist, silently skip validation
            if (error.message && error.message.includes('active_session_id')) {
                return true;
            }
            console.error("Session validation error:", error);
            return true; // Don't log out on error
        }

        const localSessionId = getLocalSessionId();

        if (profileData.active_session_id && profileData.active_session_id !== localSessionId) {
            console.warn(`❌ Session invalidated! User logged in elsewhere.`);
            console.warn(`   Database session: ${profileData.active_session_id}`);
            console.warn(`   Local session: ${localSessionId}`);
            console.warn(`   Logging out...`);

            // Log out this session
            await supabaseClient.auth.signOut();
            showError("You've been logged in on another device. Please log in again.");

            return false;
        }

        return true;
    } catch (error) {
        console.error("Session validation error:", error);
        return true; // Don't log out on error
    }
}
// Track auth events to detect multiple firings
let authEventHistory = [];

function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; }
    console.log("Setting up auth listener...");

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        const eventTimestamp = Date.now();
        authEventHistory.push({ event: _event, timestamp: eventTimestamp });

        // Keep only last 10 events
        if (authEventHistory.length > 10) {
            authEventHistory.shift();
        }

        console.log(`========== Auth Event: ${_event} (${new Date(eventTimestamp).toISOString()}) ==========`);
        console.log(`Recent auth events: ${authEventHistory.map(e => `${e.event}@${e.timestamp}`).join(', ')}`);

        const user = session?.user ?? null;
        console.log(`User: ${user ? user.id : 'null'}`);
        console.log(`Session: ${session ? 'EXISTS' : 'null'}`);

        try {
            if (user) {
                currentUser = user;

                // Load cached profile immediately if needed
                if (!currentUserProfile || currentUserProfile.id !== user.id) {
                    const cachedProfile = loadCachedProfile(user.id);
                    if (cachedProfile) {
                        currentUserProfile = cachedProfile;
                        console.log(`✓ Using cached profile: ${cachedProfile.username}`);
                    }

                    // Fetch fresh profile in background
                    console.log("Loading fresh profile in background...");
                    checkAndCreateUserProfile(user).then(() => {
                        console.log("Profile loaded, updating UI");
                        updateAuthStateUI(user);
                    }).catch(err => {
                        console.error("Profile load error (non-blocking):", err);
                    });
                }

                // SPECIAL HANDLING for SIGNED_IN event (after OAuth)
                if (_event === 'SIGNED_IN') {
                    console.log("🎉 SIGNED_IN event detected - user just logged in via OAuth");
                    console.log(`User is now on: ${window.location.pathname}`);
                    console.log(`User should now see difficulty selection on quiz page`);
                }

                // Update UI IMMEDIATELY - no delays!
                console.log("Calling updateAuthStateUI for logged in user from auth event");
                updateAuthStateUI(user);
                console.log("updateAuthStateUI completed for logged in user");
            } else {
                // Don't update UI to logged out state if we're in the middle of OAuth
                const urlHash = window.location.hash;
                const hasOAuthParams = urlHash.includes('access_token') || urlHash.includes('refresh_token');

                if (hasOAuthParams) {
                    console.log("⏳ OAuth parameters detected in URL - waiting for SIGNED_IN event...");
                    return; // Don't update UI yet, wait for OAuth to complete
                }

                if (_event === 'SIGNED_OUT') {
                    // Clear cached profile on logout
                    if (currentUser) {
                        clearCachedProfile(currentUser.id);
                    }
                    currentUserProfile = null;
                    console.log("User signed out");
                }
                currentUser = null;

                // Update UI IMMEDIATELY - no delays!
                console.log("Calling updateAuthStateUI for logged out user from auth event");
                updateAuthStateUI(null);
                console.log("updateAuthStateUI completed for logged out user");
            }
        } catch (error) {
            console.error("======= ERROR in auth state change handler =======", error);
            console.error("Error details:", error);
            hideLoading();
            showError("Authentication error. Please refresh the page.");
        } finally {
            hideLoading();
        }

        console.log(`========== Auth Event ${_event} Completed ==========\n`);
    });

    console.log("Auth listener set up.");
}
async function checkInitialAuthState() { if (!supabaseClient) { return; }; console.log("Checking initial auth..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial session:", currentUser ? currentUser.id : "None"); } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; } }
function showNicknameEditForm() {
    console.log('showNicknameEditForm called');
    console.log('currentUserProfile:', currentUserProfile);
    console.log('userNicknameElement:', userNicknameElement);
    console.log('editNicknameForm:', editNicknameForm);
    console.log('nicknameInputElement:', nicknameInputElement);

    if (!currentUserProfile) {
        console.error('❌ Cannot edit nickname: profile not loaded yet');
        showError('Please wait for your profile to load...');
        return;
    }

    if (!userNicknameElement || !editNicknameForm || !nicknameInputElement) {
        console.error('❌ Cannot edit nickname: form elements not found');
        return;
    }

    hideError();
    nicknameInputElement.value = currentUserProfile.username || '';
    editNicknameForm.style.display = 'block';
    nicknameInputElement.focus();
    nicknameInputElement.select();
    console.log('✓ Nickname edit form displayed');
}
function hideNicknameEditForm() { if (!editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = ''; }
async function handleNicknameSave(event) { event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("3-25 chars needed."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError(); try { const { data: updatedData, error } = await supabaseClient .from('profiles') .update({ username: newNickname, updated_at: new Date() }) .eq('id', currentUser.id) .select('username') .single(); if (error) throw error; console.log("Nickname updated:", updatedData); currentUserProfile.username = updatedData.username; if (userNicknameElement) { userNicknameElement.textContent = truncateString(updatedData.username); } hideNicknameEditForm(); showError("Nickname updated!"); setTimeout(hideError, 2500); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Update failed: ${error.message}`); } finally { hideLoading(); } }

// ----- 6. Helper Function: Truncate Long Words -----
function truncateLongWords(text) {
    if (!text) return text;
    const words = text.split(' ');
    const processedWords = words.map(word => {
        // If word is longer than 25 characters, truncate to 22 and add "..."
        if (word.length > 25) {
            return word.substring(0, 22) + '...';
        }
        return word;
    });
    return processedWords.join(' ');
}

// ----- 7. Display Question Function -----
function displayQuestion(questionData) { if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { showError("Error displaying question."); endGame(); return; } currentQuestionData = questionData; hideError(); if (stickerImageElement) { stickerImageElement.classList.remove('fade-in'); void stickerImageElement.offsetWidth; } stickerImageElement.src = questionData.imageUrl; stickerImageElement.alt = "Club Sticker"; if (stickerImageElement) { stickerImageElement.classList.add('fade-in'); } stickerImageElement.onerror = () => { console.error(`Error loading image AFTER preload: ${questionData.imageUrl}`); showError("Failed to display image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.className = 'btn'; button.textContent = truncateLongWords(optionText); button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { showError("Error displaying options."); setTimeout(endGame, 500); return; } timeLeft = 10; if(timeLeftElement) { timeLeftElement.textContent = timeLeft; timeLeftElement.classList.remove('low-time'); /* Ð¡ÐºÐ¸Ð´Ð°Ñ"Ð¼Ð¾ Ñ‡ÐµÑ€Ð²Ð¾Ð½Ð¸Ð¹ ÐºÐ¾Ð»Ñ–Ñ€ */ } if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer();

    // Start preloading next question immediately
    console.log("Starting background prefetch of next question...");
    nextQuestionPromise = loadNewQuestion(true);
}

// ----- 7. Handle User Answer Function -----
async function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; let selectedButton = null; let correctButton = null; buttons.forEach(button => { if (button.textContent === selectedOption) { selectedButton = button; } if (button.textContent === currentQuestionData.correctAnswer) { correctButton = button; } }); if (isCorrect) { currentScore++; if (currentScoreElement) currentScoreElement.textContent = currentScore; if (scoreDisplayElement) { scoreDisplayElement.classList.remove('score-updated'); void scoreDisplayElement.offsetWidth; scoreDisplayElement.classList.add('score-updated'); } if (selectedButton) { selectedButton.classList.add('correct-answer'); } // Use preloaded question if available, otherwise start loading
        let questionPromise = nextQuestionPromise;
        nextQuestionPromise = null; // Clear it to avoid reuse
        if (!questionPromise) {
            console.log("Correct: No prefetched question, loading now...");
            questionPromise = loadNewQuestion(true);
        } else {
            console.log("Correct: Using prefetched question...");
        } console.log("Waiting 1.5s..."); await new Promise(resolve => setTimeout(resolve, 1500)); if (selectedButton) { selectedButton.classList.remove('correct-answer'); } console.log("Waiting 0.5s..."); await new Promise(resolve => setTimeout(resolve, 500)); try { console.log("Waiting preload finish..."); const questionData = await questionPromise; console.log("Preload finished."); if (questionData) { displayQuestion(questionData); } else { console.error("Correct: Failed preload."); endGame(); } } catch (error) { console.error("Correct: Error awaiting preload:", error); endGame(); } } else { if (selectedButton) { selectedButton.classList.add('incorrect-answer'); } if (correctButton) { correctButton.classList.add('correct-answer'); } console.log("Incorrect: Waiting 1.5s..."); await new Promise(resolve => setTimeout(resolve, 1500)); if (selectedButton) { selectedButton.classList.remove('incorrect-answer'); } if (correctButton) { correctButton.classList.remove('correct-answer'); } console.log("Incorrect: Waiting 0.5s..."); await new Promise(resolve => setTimeout(resolve, 500)); endGame(); } }

// ----- 8. Timer Functions (ÐžÐ½Ð¾Ð²Ð»ÐµÐ½Ð¾ Ð´Ð»Ñ Ð°Ð½Ñ–Ð¼Ð°Ñ†Ñ–Ñ— Ñ‚Ð° ÐºÐ¾Ð»ÑŒÐ¾Ñ€Ñƒ) -----
function startTimer() {
    stopTimer();
    timeLeft = 10;

    if(!timeLeftElement) { console.error("Timer element not found!"); return; }
    timeLeftElement.textContent = timeLeft; // ÐŸÐ¾Ñ‡Ð°Ñ‚ÐºÐ¾Ð²Ðµ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ
    timeLeftElement.classList.remove('low-time', 'timer-tick-animation'); // Ð¡ÐºÐ¸Ð´Ð°Ñ”Ð¼Ð¾ ÑÑ‚Ð¸Ð»Ñ–

    timerInterval = setInterval(() => {
        timeLeft--;

        if(timeLeftElement) {
             try {
                 timeLeftElement.textContent = timeLeft.toString(); // ÐžÐ½Ð¾Ð²Ð»ÑŽÑ”Ð¼Ð¾ Ñ‚ÐµÐºÑÑ‚

                 // Ð›Ð¾Ð³Ñ–ÐºÐ° Ð´Ð»Ñ Ð¾ÑÑ‚Ð°Ð½Ð½Ñ–Ñ… 3 ÑÐµÐºÑƒÐ½Ð´
                 if (timeLeft <= 3 && timeLeft >= 0) { // >= 0 Ñ‰Ð¾Ð± Ð°Ð½Ñ–Ð¼Ð°Ñ†Ñ–Ñ Ð±ÑƒÐ»Ð° Ñ– Ð´Ð»Ñ 0
                     timeLeftElement.classList.add('low-time'); // Ð”Ð¾Ð´Ð°Ñ”Ð¼Ð¾ ÐºÐ»Ð°Ñ Ð´Ð»Ñ Ñ‡ÐµÑ€Ð²Ð¾Ð½Ð¾Ð³Ð¾ ÐºÐ¾Ð»ÑŒÐ¾Ñ€Ñƒ
                     // Ð—Ð°Ð¿ÑƒÑÐºÐ°Ñ”Ð¼Ð¾ Ð°Ð½Ñ–Ð¼Ð°Ñ†Ñ–ÑŽ "Ñ‚Ñ–ÐºÑƒ"
                     timeLeftElement.classList.remove('timer-tick-animation');
                     void timeLeftElement.offsetWidth; // Reflow
                     timeLeftElement.classList.add('timer-tick-animation');
                 } else {
                      timeLeftElement.classList.remove('low-time'); // ÐŸÑ€Ð¸Ð±Ð¸Ñ€Ð°Ñ”Ð¼Ð¾ Ñ‡ÐµÑ€Ð²Ð¾Ð½Ð¸Ð¹ ÐºÐ¾Ð»Ñ–Ñ€
                 }

             } catch(e) {
                 console.error("Error updating timer display:", e);
                 stopTimer();
             }
        } else {
             console.warn("Timer running but timeLeftElement missing.");
             stopTimer();
             return;
        }

        // ÐŸÐµÑ€ÐµÐ²Ñ–Ñ€ÐºÐ° Ð·Ð°ÐºÑ–Ð½Ñ‡ÐµÐ½Ð½Ñ Ñ‡Ð°ÑÑƒ
        if (timeLeft < 0) { // Ð—Ð¼Ñ–Ð½ÐµÐ½Ð¾ Ð½Ð° < 0, Ñ‰Ð¾Ð± 0 Ð²ÑÑ‚Ð¸Ð³ Ð²Ñ–Ð´Ð¾Ð±Ñ€Ð°Ð·Ð¸Ñ‚Ð¸ÑÑŒ
            stopTimer();
            console.log("Time ran out!");
            if (optionsContainerElement && currentQuestionData) {
                const buttons = optionsContainerElement.querySelectorAll('button');
                buttons.forEach(button => {
                    button.disabled = true;
                    if (button.textContent === currentQuestionData.correctAnswer) {
                        button.classList.add('correct-answer'); // ÐŸÐ¾ÐºÐ°Ð·ÑƒÑ”Ð¼Ð¾ Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ñƒ Ð²Ñ–Ð´Ð¿Ð¾Ð²Ñ–Ð´ÑŒ
                    }
                });
            }
            setTimeout(endGame, 1500); // Ð—Ð°Ð²ÐµÑ€ÑˆÑƒÑ”Ð¼Ð¾ Ð³Ñ€Ñƒ Ð¿Ñ–ÑÐ»Ñ Ð¿Ð°ÑƒÐ·Ð¸
        }
    }, 1000); // Run every second
}
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }
// ----------------------------------------------------

// ----- 9. Game Flow Functions -----
function showDifficultySelection() {
    console.log("showDifficultySelection() called");
    console.log(`currentUser: ${currentUser ? currentUser.id : 'null'}`);

    hideError();

    if (!difficultySelectionElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement || !landingPageElement || !introTextElement ) {
        console.warn("showDifficultySelection: Missing elements, attempting to re-initialize");
        if (!initializeDOMElements(true)) {
            console.error("showDifficultySelection: Failed to initialize DOM elements");
            return;
        }
    }

    console.log("Hiding game and result areas");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';

    console.log("Showing intro text and player stats");
    if(introTextElement) {
        introTextElement.style.display = 'block';
        console.log("introTextElement display set to block");
    }

    if(playerStatsElement) {
        playerStatsElement.style.display = 'block';
        console.log("playerStatsElement display set to block");
        loadPlayerStatistics();
    }

    if (currentUser) {
        console.log("User is logged in, showing difficulty selection");
        if(landingPageElement) {
            landingPageElement.style.display = 'none';
            console.log("landingPageElement hidden");
        }
        if(difficultySelectionElement) {
            difficultySelectionElement.style.display = 'block';
            console.log("difficultySelectionElement display set to block");
        }
        console.log("Showing difficulty selection for logged in user.");
    } else {
        console.log("User is not logged in, showing landing page");
        if(difficultySelectionElement) {
            difficultySelectionElement.style.display = 'none';
            console.log("difficultySelectionElement hidden");
        }
        if(landingPageElement) {
            landingPageElement.style.display = 'flex';
            console.log("landingPageElement display set to flex");
        }
        console.log("Showing landing page for non-logged in user.");
    }

    console.log("showDifficultySelection() completed");
}
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty ${selectedDifficulty} selected.`); preloadingPromise = loadNewQuestion(true); console.log('Started preloading first question...'); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if(playerStatsElement) playerStatsElement.style.display = 'none'; startGame(); }
function startEasyGame() { selectedDifficulty = 1; console.log('Starting Easy game without login.'); preloadingPromise = loadNewQuestion(true); console.log('Started preloading first question...'); if(landingPageElement) landingPageElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if(playerStatsElement) playerStatsElement.style.display = 'none'; startGame(); }
async function startGame() { hideError(); if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(landingPageElement) landingPageElement.style.display = 'none'; console.log(`Starting game: Diff ${selectedDifficulty}`); if (preloadingPromise) { console.log('Using preloaded first question...'); const questionData = await preloadingPromise; preloadingPromise = null; if (questionData) { displayQuestion(questionData); } else { console.error('Preloaded question failed. Loading new one...'); await loadNextQuestion(); } } else { await loadNextQuestion(); } }
async function loadNextQuestion(isQuickTransition = false) { const questionData = await loadNewQuestion(isQuickTransition); if (questionData) { displayQuestion(questionData); } else { console.error("loadNextQuestion: Failed. Ending game."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { resultAreaElement.style.display = 'block'; if(finalScoreElement) finalScoreElement.textContent = currentScore; } if(introTextElement) introTextElement.style.display = 'block'; } }
async function loadNewQuestion(isQuickTransition = false) { if (!supabaseClient) { showError("DB connection error."); return null; } if (selectedDifficulty === null) { showError("No difficulty selected."); return null; } if (!clubNamesLoaded) { console.log("Club names not loaded..."); showLoading(); const loaded = await loadAllClubNames(); hideLoading(); if (!loaded) { showError("Failed to load essential game data."); return null; } } if (!isQuickTransition) { showLoading(); } hideError(); try { if (!supabaseClient) throw new Error("Supabase client lost."); console.log("Fetching sticker...");

        // Use cached count instead of querying every time
        const stickerCount = await getStickerCount(selectedDifficulty);
        const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient .from('stickers') .select(`image_url, clubs ( id, name )`) .eq('difficulty', selectedDifficulty) .order('id', { ascending: true }) .range(randomIndex, randomIndex) .single(); if (stickerError) throw new Error(`Sticker fetch error: ${stickerError.message}`); if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker/club data."); const correctClubName = randomStickerData.clubs.name; const imageUrl = randomStickerData.image_url; console.log(`Correct answer: ${correctClubName}`); if (allClubNames.length < 4) { throw new Error("Not enough club names loaded."); } const potentialOptions = allClubNames.filter(name => name !== correctClubName); potentialOptions.sort(() => 0.5 - Math.random()); const incorrectOptions = potentialOptions.slice(0, 3); if (incorrectOptions.length < 3) { throw new Error("Failed to get 3 distinct incorrect options."); } console.log("Incorrect options chosen:", incorrectOptions); const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()); const questionDataForDisplay = { imageUrl: imageUrl, options: allOptions, correctAnswer: correctClubName }; console.log(`Preloading image: ${imageUrl}`); await new Promise((resolve) => { const img = new Image(); img.onload = () => { console.log(`Image preloaded: ${imageUrl}`); resolve(); }; img.onerror = (err) => { console.error(`Failed preload: ${imageUrl}`, err); resolve(); }; img.src = imageUrl; }); console.log("Returning preloaded question data."); return questionDataForDisplay; } catch (error) { console.error("Error loadNewQuestion:", error); showError(`Loading Error: ${error.message || 'Failed to load question'}`); return null; } finally { hideLoading(); } }

// ----- Function: Get User Rank for Today -----
async function getUserRankForToday(userId, score, difficulty) {
    if (!supabaseClient || !userId || score === 0) return null;

    try {
        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const startOfNextDay = new Date(startOfDay);
        startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1);

        // Count how many scores are better than the current score for today
        const { count, error } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .eq('difficulty', difficulty)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', startOfNextDay.toISOString())
            .gt('score', score);

        if (error) throw error;

        // Rank is count + 1 (because count is number of better scores)
        return (count || 0) + 1;
    } catch (error) {
        console.error('Error getting user rank:', error);
        return null;
    }
}

function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) { finalScoreElement.textContent = currentScore; finalScoreElement.classList.remove('final-score-animated'); void finalScoreElement.offsetWidth; finalScoreElement.classList.add('final-score-animated'); } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(resultSignInButton) { if (!currentUser) { resultSignInButton.style.display = 'inline-block'; } else { resultSignInButton.style.display = 'none'; } } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'block';

    // Display rank if user is authenticated and has a score
    if (currentUser && currentScore > 0 && rankContainerElement) {
        getUserRankForToday(currentUser.id, currentScore, selectedDifficulty).then(rank => {
            if (rank !== null && rankContainerElement) {
                rankContainerElement.textContent = `#${rank} for today`;
                rankContainerElement.style.display = 'block';
            }
        });
    } else if (rankContainerElement) {
        rankContainerElement.style.display = 'none';
    }

    saveScore(); }
async function saveScore() { if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { return; } console.log(`Saving score: ${currentScore}, Diff: ${selectedDifficulty}`); showLoading(); let detectedCountryCode = null; try { const { error } = await supabaseClient .from('scores') .insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay=new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate()+1); fromDate=startOfDay.toISOString(); toDate=startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate()-7); fromDate=sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate()-30); fromDate=thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate=null; toDate=null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { showError("DB connection error."); return null; } console.log(`Workspaceing leaderboard: ${timeframe}, Diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient .from('scores') .select(`score, created_at, user_id, profiles ( username )`) .eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query .order('score', { ascending: false }) .order('created_at', { ascending: true }) .limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = ''; if (!data) { leaderboardListElement.innerHTML = '<li>Error loading.</li>'; return; } if (data.length === 0) { leaderboardListElement.innerHTML = '<li>No scores found.</li>'; return; } const currentUserId = currentUser?.id; data.forEach((entry) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; const textNode = document.createTextNode(`${username} - ${entry.score}`); li.appendChild(textNode); if (currentUserId && entry.user_id === currentUserId) { li.classList.add('user-score'); } leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !landingPageElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement || !introTextElement ) { handleCriticalError("UI Error opening leaderboard."); return; } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(landingPageElement) landingPageElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if(playerStatsElement) playerStatsElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }

// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); stopTimer(); document.body.innerHTML = `<h1>Application Error</h1><p>${message}</p><p>Please try refreshing the page.</p>`;}
function showLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'block'; } }
function hideLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'none'; } }

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("========== DOM LOADED - INITIALIZING APP ==========");

    // Ensure loading indicator is hidden
    hideLoading();

    console.log("Initializing DOM elements...");
    if (!initializeDOMElements()) {
        console.error("Failed to initialize DOM elements!");
        return;
    }
    console.log("DOM elements initialized successfully");

    loadAllClubNames().then(success => {
        if (success) { console.log("Club names pre-loaded."); }
        else { console.error("Failed to pre-load club names."); showError("Error loading game data."); }
    });

    // Pre-cache sticker counts for all difficulties
    Promise.all([
        getStickerCount(1).catch(err => console.error("Failed to cache count for difficulty 1:", err)),
        getStickerCount(2).catch(err => console.error("Failed to cache count for difficulty 2:", err)),
        getStickerCount(3).catch(err => console.error("Failed to cache count for difficulty 3:", err))
    ]).then(() => {
        console.log("Sticker counts pre-cached for all difficulties.");
    });

    console.log("App init finished. Setting up auth...");
    setupAuthStateChangeListener();

    // Get initial session and update UI immediately
    console.log("Getting initial session...");
    supabaseClient.auth.getSession().then(async ({ data: { session }, error }) => {
        console.log("========== INITIAL SESSION CHECK ==========");

        if (error) {
            console.error("Error getting session:", error);
            updateAuthStateUI(null);
            return;
        }

        const user = session?.user ?? null;
        console.log(`User found: ${user ? 'YES' : 'NO'}`);

        if (user) {
            currentUser = user;

            // Load cached profile immediately (synchronous, instant)
            const cachedProfile = loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                console.log(`✓ Using cached profile: ${cachedProfile.username}`);
            } else {
                console.log("No cached profile, will load in background");
            }

            // Fetch fresh profile in background (don't await, don't block UI)
            if (!currentUserProfile || currentUserProfile.id !== user.id) {
                console.log("Loading fresh profile in background...");
                checkAndCreateUserProfile(user).then(() => {
                    console.log("Profile loaded, updating UI");
                    // Update UI again with fresh profile data
                    updateAuthStateUI(user);
                }).catch(err => {
                    console.error("Profile load error (non-blocking):", err);
                    // UI still works with cached data or "Loading..." state
                });
            }
        }

        // Update UI IMMEDIATELY - don't wait for profile fetch
        console.log("Updating UI from initializeApp (immediate)");

        // Force immediate UI update
        updateAuthStateUI(user);

        // Additional forced update after short delay to ensure rendering
        setTimeout(() => {
            console.log("🔄 Forced UI refresh after delay");
            updateAuthStateUI(user);
        }, 100);

        console.log("========== INITIAL SESSION CHECK COMPLETE ==========");
    });

    // Set up periodic session validation (every 10 seconds)
    // This will log out users who logged in on another device
    setInterval(async () => {
        if (currentUser) {
            console.log("⏰ Periodic session validation check...");
            const isValid = await validateSession();
            if (!isValid) {
                console.log("❌ Session invalidated - user logged in elsewhere");
            } else {
                console.log("✓ Session valid");
            }
        }
    }, 10000); // 10 seconds - faster detection of logins on other devices

    console.log("✓ Periodic session validation enabled (every 10s)");
}
