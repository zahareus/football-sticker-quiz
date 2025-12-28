// script.js - Main quiz game logic
// Uses SharedUtils from shared.js for common functionality

// ----- 1. Initialize Supabase Client -----
let supabaseClient;

// ----- 2. Global Game State Variables -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = SharedUtils.CONFIG.TIMER_DURATION;
let timerInterval = null;
let currentUser = null;
let currentUserProfile = null;
let selectedDifficulty = 1;
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;
let allClubNames = [];
let clubNamesLoaded = false;
let preloadingPromise = null;
let stickerCountCache = {};
let nextQuestionPromise = null;

// ----- Time To Run Mode Variables -----
let currentGameMode = SharedUtils.CONFIG.GAME_MODE_CLASSIC; // 'classic' or 'ttr'
let ttrStickerIndex = 0;  // Tracks current position in the 3-2-1 pattern
let ttrTimerPaused = false;  // Pause timer while loading
let currentStickerDifficulty = 1;  // Current sticker's difficulty for scoring

// TTR pattern: 3 easy (diff 1), 2 medium (diff 2), 1 hard (diff 3), repeat
// Pattern indices: 0,1,2 = easy, 3,4 = medium, 5 = hard
const TTR_PATTERN_LENGTH = 6;
function getTTRDifficulty(index) {
    const patternIndex = index % TTR_PATTERN_LENGTH;
    if (patternIndex < 3) return 1;  // Easy (indices 0, 1, 2)
    if (patternIndex < 5) return 2;  // Medium (indices 3, 4)
    return 3;  // Hard (index 5)
}

// Preload queue for faster transitions (holds 2-3 preloaded questions)
let preloadQueue = [];
const PRELOAD_QUEUE_SIZE = 3;

// ----- Script Entry Point -----
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before script.js');
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
    if (supabaseClient) {
        // Simple approach: Just wait for DOM, then initialize everything
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }
    } else {
        handleCriticalError('Error connecting to the game. Please refresh the page.');
    }
}

// Preload an image and decode it for smooth display
async function preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            try {
                // Use decode() for smoother rendering if available
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

// Fill preload queue with questions
async function fillPreloadQueue() {
    while (preloadQueue.length < PRELOAD_QUEUE_SIZE) {
        try {
            const questionData = await loadNewQuestionInternal();
            if (questionData) {
                preloadQueue.push(questionData);
            } else {
                break; // Stop if we can't load more questions
            }
        } catch (error) {
            console.warn('Failed to preload question:', error);
            break;
        }
    }
}

// Get next question from preload queue
function getPreloadedQuestion() {
    if (preloadQueue.length > 0) {
        const question = preloadQueue.shift();
        // Refill queue in background
        fillPreloadQueue().catch(() => {});
        return question;
    }
    return null;
}

// ----- 3. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, finalScoreElement, playAgainButton, resultSignInButton, authSectionElement, loginButton, userStatusElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton;
let userNicknameElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton;
let scoreDisplayElement;
let landingPageElement, landingLoginButton, landingLeaderboardButton, landingPlayEasyButton, landingTTRButton;
let ttrModeButton;
let introTextElement;
let personalRankContainerElement, timeframeRanksContainerElement;
let playerStatsElement, playersTotalElement, playersTodayElement;
let leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;
let gameOverTextElement, percentileValueElement, resultStickerInfoButton;
let gameRightPanelElement, resultRightPanelElement;

// Flag to track if event listeners have been added
let eventListenersAdded = false;

// Initialize DOM Elements
function initializeDOMElements(isRetry = false) {
    gameAreaElement = document.getElementById('game-area');
    stickerImageElement = document.getElementById('sticker-image');
    optionsContainerElement = document.getElementById('options');
    timeLeftElement = document.getElementById('time-left');
    currentScoreElement = document.getElementById('current-score');
    scoreDisplayElement = document.getElementById('score');
    finalScoreElement = document.getElementById('final-score');
    personalRankContainerElement = document.getElementById('personal-rank-container');
    timeframeRanksContainerElement = document.getElementById('timeframe-ranks-container');
    playAgainButton = document.getElementById('play-again');
    resultSignInButton = document.getElementById('result-sign-in-button');
    authSectionElement = document.getElementById('auth-section');
    loginButton = document.getElementById('login-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');
    logoutButton = document.getElementById('logout-button');
    difficultySelectionElement = document.getElementById('difficulty-selection');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');
    difficultyButtons = document.querySelectorAll('.difficulty-option .difficulty-button');
    leaderboardSectionElement = document.getElementById('leaderboard-section');
    leaderboardListElement = document.getElementById('leaderboard-list');
    closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');
    landingPageElement = document.getElementById('landing-page');
    landingLoginButton = document.getElementById('landing-login-button');
    landingLeaderboardButton = document.getElementById('landing-leaderboard-button');
    landingPlayEasyButton = document.getElementById('landing-play-easy-button');
    landingTTRButton = document.getElementById('landing-ttr-button');
    ttrModeButton = document.getElementById('ttr-mode-button');
    introTextElement = document.getElementById('intro-text-element');
    playerStatsElement = document.getElementById('player-stats-element');
    playersTotalElement = document.getElementById('players-total');
    playersTodayElement = document.getElementById('players-today');
    gameOverTextElement = document.getElementById('game-over-text');
    percentileValueElement = document.getElementById('percentile-value');
    resultStickerInfoButton = document.getElementById('result-sticker-info-button');
    gameRightPanelElement = document.querySelector('.game-right-panel');
    resultRightPanelElement = document.querySelector('.result-right-panel');

    const elements = {
        gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement,
        currentScoreElement, scoreDisplayElement, finalScoreElement,
        playAgainButton, resultSignInButton, authSectionElement, loginButton,
        userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement,
        leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton,
        loadingIndicator, errorMessageElement, editNicknameForm, nicknameInputElement,
        cancelEditNicknameButton, landingPageElement, landingLoginButton,
        landingLeaderboardButton, landingPlayEasyButton, introTextElement,
        gameRightPanelElement, resultRightPanelElement
    };

    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Error: Could not find DOM element: ${key}`);
            allFound = false;
        }
    }

    if (!difficultyButtons || difficultyButtons.length !== 3) {
        console.error(`Error: Found ${difficultyButtons?.length || 0} difficulty buttons, expected 3!`);
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
        if (!isRetry) {
            handleCriticalError("UI Error: Missing page elements.");
        }
        return false;
    }

    // Add Event Listeners (only once)
    if (!eventListenersAdded) {
        playAgainButton.addEventListener('click', () => window.location.reload());
        loginButton.addEventListener('click', handleLoginClick);
        landingLoginButton.addEventListener('click', handleLoginClick);
        if (resultSignInButton) resultSignInButton.addEventListener('click', handleLoginClick);
        logoutButton.addEventListener('click', handleLogoutClick);
        difficultyButtons.forEach(button => button.addEventListener('click', handleDifficultySelection));
        if (landingLeaderboardButton) landingLeaderboardButton.addEventListener('click', openLeaderboard);
        if (landingPlayEasyButton) landingPlayEasyButton.addEventListener('click', startEasyGame);
        if (landingTTRButton) landingTTRButton.addEventListener('click', startTTRGame);
        if (ttrModeButton) ttrModeButton.addEventListener('click', startTTRGame);
        closeLeaderboardButton.addEventListener('click', closeLeaderboard);
        leaderboardTimeFilterButtons.forEach(button => button.addEventListener('click', handleTimeFilterChange));
        leaderboardDifficultyFilterButtons.forEach(button => button.addEventListener('click', handleDifficultyFilterChange));

        // userNicknameElement href is updated in updateAuthStateUI

        editNicknameForm.addEventListener('submit', handleNicknameSave);
        cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);

        // Animation End Listeners
        if (scoreDisplayElement) {
            scoreDisplayElement.addEventListener('animationend', () => {
                scoreDisplayElement.classList.remove('score-updated');
            });
        }
        if (finalScoreElement) {
            finalScoreElement.addEventListener('animationend', () => {
                finalScoreElement.classList.remove('final-score-animated');
            });
        }
        if (stickerImageElement) {
            stickerImageElement.addEventListener('animationend', (event) => {
                if (event.animationName === 'fadeIn') {
                    stickerImageElement.classList.remove('fade-in');
                }
            });
        }
        if (timeLeftElement) {
            timeLeftElement.addEventListener('animationend', (event) => {
                if (event.animationName === 'timer-tick') {
                    timeLeftElement.classList.remove('timer-tick-animation');
                }
            });
        }

        eventListenersAdded = true;
    }

    return true;
}

// ----- 4. Authentication Functions -----
function handleLoginClick() {
    if (!supabaseClient) {
        showError("Client error.");
        return;
    }
    hideError();
    showLoading();
    SharedUtils.loginWithGoogle(supabaseClient, '/quiz.html').then(result => {
        if (result.error) {
            showError(`Login failed: ${result.error.message}`);
            hideLoading();
        }
    });
}

async function handleLogoutClick() {
    if (!supabaseClient) {
        showError("Client error.");
        return;
    }
    showLoading();
    hideError();

    // Stop session validation before logout
    SharedUtils.stopSessionValidation();

    const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
    if (result.error) {
        showError(`Logout failed: ${result.error.message}`);
        hideLoading();
    } else {
        window.location.reload();
    }
}

function updateAuthStateUI(user) {
    // Force re-initialize if elements missing
    if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !landingPageElement || !introTextElement) {
        initializeDOMElements(true);
    }

    if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !landingPageElement || !introTextElement) {
        console.error("CRITICAL ERROR: Elements still missing after re-init!");
        return;
    }

    const bodyElement = document.body;
    hideNicknameEditForm();
    hideLoading();

    // Hide ALL sections first
    difficultySelectionElement.style.cssText = 'display: none !important;';
    gameAreaElement.style.cssText = 'display: none !important;';
    leaderboardSectionElement.style.cssText = 'display: none !important;';
    landingPageElement.style.cssText = 'display: none !important;';
    introTextElement.style.cssText = 'display: none !important;';
    if (playerStatsElement) playerStatsElement.style.cssText = 'display: none !important;';

    if (user) {
        bodyElement.classList.remove('logged-out');

        let displayName = 'Loading...';
        if (currentUserProfile?.username) {
            displayName = currentUserProfile.username;
        }

        userNicknameElement.textContent = SharedUtils.truncateString(displayName);
        userNicknameElement.href = `/profile.html?id=${user.id}`;
        userStatusElement.style.cssText = 'display: flex !important;';
        loginButton.style.cssText = 'display: none !important;';

        difficultySelectionElement.style.cssText = 'display: block !important;';
        introTextElement.style.cssText = 'display: block !important;';
        loadPlayerStatistics();
    } else {
        bodyElement.classList.add('logged-out');
        currentUser = null;
        currentUserProfile = null;

        loginButton.style.cssText = 'display: none !important;';
        userStatusElement.style.cssText = 'display: none !important;';
        stopTimer();

        landingPageElement.style.cssText = 'display: flex !important;';
        introTextElement.style.cssText = 'display: block !important;';
        loadPlayerStatistics();
    }
}

async function checkAndCreateUserProfile(user) {
    if (!supabaseClient || !user) return null;

    let fetchedProfile = await SharedUtils.loadUserProfile(supabaseClient, user);

    if (!fetchedProfile) {
        // Create new profile
        fetchedProfile = await SharedUtils.createUserProfile(supabaseClient, user);
    } else {
        // Update session if needed
        if ('active_session_id' in fetchedProfile) {
            const localSessionId = SharedUtils.getLocalSessionId();
            if (!fetchedProfile.active_session_id || fetchedProfile.active_session_id !== localSessionId) {
                await supabaseClient
                    .from('profiles')
                    .update({
                        active_session_id: localSessionId,
                        updated_at: new Date()
                    })
                    .eq('id', user.id);
                fetchedProfile.active_session_id = localSessionId;
            }
        }
    }

    if (fetchedProfile) {
        currentUserProfile = fetchedProfile;
        SharedUtils.cacheUserProfile(fetchedProfile);
    }

    return fetchedProfile?.username || user.email || 'User';
}

/**
 * Auth state change handler - only for logout/session changes AFTER initial load
 * CRITICAL FIX: Ignores INITIAL_SESSION to prevent double-processing with getSession()
 * This is essential for mobile where race conditions can cause blank screens
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: Skip INITIAL_SESSION - we handle this in initializeApp() with getSession()
        // This prevents race conditions on mobile where the same session gets processed twice,
        // which can result in UI being in an inconsistent state (blank screen)
        if (event === 'INITIAL_SESSION') {
            return;
        }

        const user = session?.user ?? null;

        // Handle logout
        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                SharedUtils.clearCachedProfile(currentUser.id);
                SharedUtils.stopSessionValidation();
            }
            currentUser = null;
            currentUserProfile = null;
            updateAuthStateUI(null);
            return;
        }

        // Handle new sign in (e.g., from another tab)
        if (event === 'SIGNED_IN' && user) {
            // Only process if it's a different user or we don't have a user yet
            // This prevents duplicate processing that can cause UI flicker on mobile
            if (!currentUser || currentUser.id !== user.id) {
                currentUser = user;
                const cachedProfile = SharedUtils.loadCachedProfile(user.id);
                if (cachedProfile) {
                    currentUserProfile = cachedProfile;
                }
                checkAndCreateUserProfile(user).then(() => {
                    updateAuthStateUI(user);
                });
            }
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && user) {
            currentUser = user;
        }
    });
}

// ----- 5. Nickname Functions -----
function showNicknameEditForm() {
    if (!currentUserProfile) {
        showError('Please wait for your profile to load...');
        return;
    }

    if (!editNicknameForm || !nicknameInputElement) {
        return;
    }

    hideError();
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
        showError("Cannot save.");
        return;
    }

    const newNickname = nicknameInputElement.value.trim();

    if (newNickname === currentUserProfile.username) {
        hideNicknameEditForm();
        return;
    }

    showLoading();
    hideError();

    const result = await SharedUtils.updateNickname(supabaseClient, currentUser.id, newNickname);

    if (result.error) {
        showError(`Update failed: ${result.error.message}`);
    } else {
        currentUserProfile.username = result.data.username;
        SharedUtils.cacheUserProfile(currentUserProfile);
        if (userNicknameElement) {
            userNicknameElement.textContent = SharedUtils.truncateString(result.data.username);
        }
        hideNicknameEditForm();
        showError("Nickname updated!");
        setTimeout(hideError, 2500);
        if (leaderboardSectionElement?.style.display === 'block') {
            updateLeaderboard();
        }
    }

    hideLoading();
}

// ----- 6. Data Loading Functions -----
async function loadAllClubNames() {
    if (clubNamesLoaded) return true;
    if (!supabaseClient) return false;

    try {
        const { data, error } = await supabaseClient.from('clubs').select('name');
        if (error) throw error;
        if (data) {
            allClubNames = data.map(club => club.name);
            clubNamesLoaded = true;
            return true;
        }
        throw new Error("No data for club names.");
    } catch (error) {
        console.error("Error loading club names:", error);
        clubNamesLoaded = false;
        allClubNames = [];
        return false;
    }
}

async function loadPlayerStatistics() {
    if (!supabaseClient || !playersTotalElement || !playersTodayElement) {
        return;
    }

    try {
        const { count: totalGames, error: totalError } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        const { startOfDay } = SharedUtils.getTodayRangeUTC();

        const { count: todayGames, error: todayError } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay.toISOString());

        if (todayError) throw todayError;

        playersTotalElement.textContent = totalGames || 0;
        playersTodayElement.textContent = todayGames || 0;
    } catch (error) {
        console.error('Error loading player statistics:', error);
        playersTotalElement.textContent = '-';
        playersTodayElement.textContent = '-';
    }
}

async function getStickerCount(difficulty) {
    if (stickerCountCache[difficulty]) {
        return stickerCountCache[difficulty];
    }

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
    return count;
}

// ----- 7. Display Question Function -----
async function displayQuestion(questionData) {
    if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement) {
        showError("Error displaying question.");
        endGame();
        return;
    }

    currentQuestionData = questionData;
    hideError();

    // Use requestAnimationFrame for smoother animation reset
    stickerImageElement.classList.remove('fade-in');

    // Set up the image with decode() for smooth display
    const tempImg = new Image();
    tempImg.src = questionData.imageUrl;

    try {
        // Wait for image to be decoded (if not already preloaded)
        if (tempImg.decode) {
            await tempImg.decode();
        }
    } catch (e) {
        // Image may already be cached/decoded, continue
    }

    // Now set the src - image should display instantly since it's decoded
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.alt = "Club Sticker";

    // Use requestAnimationFrame for smooth fade-in
    requestAnimationFrame(() => {
        stickerImageElement.classList.add('fade-in');
    });

    stickerImageElement.onerror = () => {
        console.error(`Error loading image: ${questionData.imageUrl}`);
        showError("Failed to display image.");
        setTimeout(endGame, 500);
    };

    // Get difficulty class for TTR mode border styling
    const difficultyClass = currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR
        ? `ttr-difficulty-${questionData.difficulty || currentStickerDifficulty}`
        : '';

    optionsContainerElement.innerHTML = '';
    // Add TTR difficulty class to options container
    optionsContainerElement.className = 'button-group options-group';
    if (difficultyClass) {
        optionsContainerElement.classList.add(difficultyClass);
    }

    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText) => {
            const button = document.createElement('button');
            button.className = 'btn';
            button.textContent = SharedUtils.truncateLongWords(optionText);
            button.disabled = false;
            button.classList.remove('correct-answer', 'incorrect-answer');
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
        });
    } else {
        showError("Error displaying options.");
        setTimeout(endGame, 500);
        return;
    }

    // For classic mode, reset timer for each question
    // For TTR mode, continue the global timer (don't reset)
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_CLASSIC) {
        timeLeft = SharedUtils.CONFIG.TIMER_DURATION;
    }
    // For TTR, the timeLeft is already set from startGame or continues from previous

    if (timeLeftElement) {
        timeLeftElement.textContent = timeLeft;
        // Remove low-time class if timer is above threshold
        if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR) {
            if (timeLeft > 10) {
                timeLeftElement.classList.remove('low-time', 'ttr-flash');
            }
        } else {
            timeLeftElement.classList.remove('low-time');
        }
    }
    if (currentScoreElement) currentScoreElement.textContent = currentScore;
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    // Show game panel, hide result panel
    if (gameRightPanelElement) gameRightPanelElement.style.display = '';
    if (resultRightPanelElement) resultRightPanelElement.style.display = 'none';

    startTimer();

    // Start filling preload queue in background (replaces single nextQuestionPromise)
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_CLASSIC) {
        fillPreloadQueue().catch(() => {});
    }
}

// ----- 8. Handle User Answer Function -----
async function handleAnswer(selectedOption) {
    stopTimer();
    hideError();

    if (!currentQuestionData || !optionsContainerElement) return;

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    const isCorrect = selectedOption === currentQuestionData.correctAnswer;

    let selectedButton = null;
    let correctButton = null;
    buttons.forEach(button => {
        if (button.textContent === selectedOption) selectedButton = button;
        if (button.textContent === currentQuestionData.correctAnswer) correctButton = button;
    });

    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR) {
        // TTR Mode: Different handling
        await handleAnswerTTR(isCorrect, selectedButton, correctButton);
    } else {
        // Classic mode: Original behavior
        if (isCorrect) {
            currentScore++;
            if (currentScoreElement) currentScoreElement.textContent = currentScore;
            if (scoreDisplayElement) {
                scoreDisplayElement.classList.remove('score-updated');
                requestAnimationFrame(() => {
                    scoreDisplayElement.classList.add('score-updated');
                });
            }
            if (selectedButton) selectedButton.classList.add('correct-answer');

            // Get preloaded question from queue (much faster than waiting)
            const preloadedQuestion = getPreloadedQuestion();

            await new Promise(resolve => setTimeout(resolve, 1500));
            if (selectedButton) selectedButton.classList.remove('correct-answer');
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                // Use preloaded question or load new one
                const questionData = preloadedQuestion || await loadNewQuestion(true);
                if (questionData) {
                    displayQuestion(questionData);
                } else {
                    endGame();
                }
            } catch (error) {
                console.error("Error loading next question:", error);
                endGame();
            }
        } else {
            if (selectedButton) selectedButton.classList.add('incorrect-answer');
            if (correctButton) correctButton.classList.add('correct-answer');

            await new Promise(resolve => setTimeout(resolve, 1500));
            if (selectedButton) selectedButton.classList.remove('incorrect-answer');
            if (correctButton) correctButton.classList.remove('correct-answer');
            await new Promise(resolve => setTimeout(resolve, 500));

            endGame();
        }
    }
}

// TTR Mode answer handling
async function handleAnswerTTR(isCorrect, selectedButton, correctButton) {
    if (isCorrect) {
        // Score based on difficulty: Easy=1, Medium=2, Hard=3
        const points = currentStickerDifficulty;
        currentScore += points;
        if (currentScoreElement) currentScoreElement.textContent = currentScore;
        if (scoreDisplayElement) {
            scoreDisplayElement.classList.remove('score-updated');
            requestAnimationFrame(() => {
                scoreDisplayElement.classList.add('score-updated');
            });
        }
        if (selectedButton) selectedButton.classList.add('correct-answer');
    } else {
        // Wrong answer - show feedback but don't end game
        if (selectedButton) selectedButton.classList.add('incorrect-answer');
        if (correctButton) correctButton.classList.add('correct-answer');
    }

    // Brief pause to show feedback
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Remove answer styling
    if (selectedButton) selectedButton.classList.remove('correct-answer', 'incorrect-answer');
    if (correctButton) correctButton.classList.remove('correct-answer');

    // Move to next sticker in pattern
    ttrStickerIndex++;
    currentStickerDifficulty = getTTRDifficulty(ttrStickerIndex);

    // Check if time has run out during the pause
    if (timeLeft <= 0) {
        endGame();
        return;
    }

    // Load next question
    try {
        const questionData = await loadNewQuestionTTR(true);
        if (questionData) {
            displayQuestion(questionData);
        } else {
            endGame();
        }
    } catch (error) {
        console.error("Error loading next TTR question:", error);
        endGame();
    }
}

// ----- 9. Timer Functions -----
function startTimer() {
    stopTimer();

    // Only reset time for classic mode - TTR mode continues its global timer
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_CLASSIC) {
        timeLeft = SharedUtils.CONFIG.TIMER_DURATION;
    }
    // For TTR mode, timeLeft continues from where it was

    if (!timeLeftElement) return;

    timeLeftElement.textContent = timeLeft;
    timeLeftElement.classList.remove('low-time', 'timer-tick-animation', 'ttr-flash');

    timerInterval = setInterval(() => {
        // Skip countdown if timer is paused (TTR loading)
        if (ttrTimerPaused) return;

        timeLeft--;

        if (timeLeftElement) {
            try {
                // Don't show negative values - show 0 as minimum
                timeLeftElement.textContent = Math.max(0, timeLeft).toString();

                if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR) {
                    // TTR mode: Flash red on last 10 seconds
                    if (timeLeft <= 10 && timeLeft >= 0) {
                        timeLeftElement.classList.add('low-time', 'ttr-flash');
                        timeLeftElement.classList.remove('timer-tick-animation');
                        void timeLeftElement.offsetWidth;
                        timeLeftElement.classList.add('timer-tick-animation');
                    } else {
                        timeLeftElement.classList.remove('low-time', 'ttr-flash');
                    }
                } else {
                    // Classic mode: Flash on last 3 seconds
                    if (timeLeft <= 3 && timeLeft >= 0) {
                        timeLeftElement.classList.add('low-time');
                        timeLeftElement.classList.remove('timer-tick-animation');
                        void timeLeftElement.offsetWidth;
                        timeLeftElement.classList.add('timer-tick-animation');
                    } else {
                        timeLeftElement.classList.remove('low-time');
                    }
                }
            } catch (e) {
                console.error("Error updating timer display:", e);
                stopTimer();
            }
        } else {
            stopTimer();
            return;
        }

        if (timeLeft <= 0) {
            stopTimer();
            if (optionsContainerElement && currentQuestionData) {
                const buttons = optionsContainerElement.querySelectorAll('button');
                buttons.forEach(button => {
                    button.disabled = true;
                    if (button.textContent === currentQuestionData.correctAnswer) {
                        button.classList.add('correct-answer');
                    }
                });
            }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ----- 10. Game Flow Functions -----
function showDifficultySelection() {
    hideError();

    if (!difficultySelectionElement || !gameAreaElement || !leaderboardSectionElement || !landingPageElement || !introTextElement) {
        if (!initializeDOMElements(true)) return;
    }

    if (gameAreaElement) gameAreaElement.style.display = 'none';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';

    if (introTextElement) introTextElement.style.display = 'block';
    loadPlayerStatistics();

    if (currentUser) {
        if (landingPageElement) landingPageElement.style.display = 'none';
        if (difficultySelectionElement) difficultySelectionElement.style.display = 'block';
    } else {
        if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
        if (landingPageElement) landingPageElement.style.display = 'flex';
    }
}

function handleDifficultySelection(event) {
    const difficulty = parseInt(event.target.dataset.difficulty, 10);
    if (![1, 2, 3].includes(difficulty)) return;

    selectedDifficulty = difficulty;
    currentGameMode = SharedUtils.CONFIG.GAME_MODE_CLASSIC;

    // Clear old queue and start preloading for new difficulty
    preloadQueue = [];
    preloadingPromise = loadNewQuestion(true);
    // Also start filling preload queue in background
    fillPreloadQueue().catch(() => {});

    if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
    if (playerStatsElement) playerStatsElement.style.display = 'none';

    startGame();
}

function startEasyGame() {
    selectedDifficulty = 1;
    currentGameMode = SharedUtils.CONFIG.GAME_MODE_CLASSIC;

    // Clear old queue and start preloading
    preloadQueue = [];
    preloadingPromise = loadNewQuestion(true);
    // Also start filling preload queue in background
    fillPreloadQueue().catch(() => {});

    if (landingPageElement) landingPageElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
    if (playerStatsElement) playerStatsElement.style.display = 'none';

    startGame();
}

function startTTRGame() {
    currentGameMode = SharedUtils.CONFIG.GAME_MODE_TTR;
    ttrStickerIndex = 0;
    ttrTimerPaused = false;

    // Start with easy difficulty (first in pattern)
    selectedDifficulty = getTTRDifficulty(0);
    currentStickerDifficulty = selectedDifficulty;

    // Clear old queue and start preloading for TTR
    preloadQueue = [];
    preloadingPromise = loadNewQuestionTTR(true);

    if (landingPageElement) landingPageElement.style.display = 'none';
    if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
    if (playerStatsElement) playerStatsElement.style.display = 'none';

    startGame();
}

async function startGame() {
    hideError();

    // For TTR mode, don't check difficulty the same way
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_CLASSIC) {
        if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) {
            showDifficultySelection();
            return;
        }
    }

    if (!gameAreaElement || !currentScoreElement || !optionsContainerElement) {
        if (!initializeDOMElements()) {
            handleCriticalError("Failed init.");
            return;
        }
    }

    // Add body class to indicate quiz is active (for hiding header/footer on mobile)
    document.body.classList.add('quiz-active');
    document.body.classList.remove('quiz-result');

    // Add TTR-specific body class for styling
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR) {
        document.body.classList.add('ttr-mode');
    } else {
        document.body.classList.remove('ttr-mode');
    }

    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;

    // Reset TTR-specific variables
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR) {
        ttrStickerIndex = 0;
        ttrTimerPaused = false;
        timeLeft = SharedUtils.CONFIG.TTR_TIMER_DURATION;
    }

    // Reset panels for new game
    if (gameRightPanelElement) gameRightPanelElement.style.display = '';
    if (resultRightPanelElement) resultRightPanelElement.style.display = 'none';

    if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    if (optionsContainerElement) optionsContainerElement.innerHTML = '';
    if (landingPageElement) landingPageElement.style.display = 'none';

    // Clear previous sticker image to start with clean state
    if (stickerImageElement) {
        stickerImageElement.src = '';
        stickerImageElement.alt = '';
    }

    if (preloadingPromise) {
        const questionData = await preloadingPromise;
        preloadingPromise = null;
        if (questionData) {
            displayQuestion(questionData);
        } else {
            await loadNextQuestion();
        }
    } else {
        await loadNextQuestion();
    }
}

async function loadNextQuestion(isQuickTransition = false) {
    const questionData = await loadNewQuestion(isQuickTransition);
    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("loadNextQuestion: Failed. Ending game.");
        endGame();
    }
}

// Internal function to load a new question (used by preload queue)
async function loadNewQuestionInternal() {
    if (!supabaseClient || selectedDifficulty === null) {
        return null;
    }

    if (!clubNamesLoaded) {
        const loaded = await loadAllClubNames();
        if (!loaded) {
            return null;
        }
    }

    try {
        const stickerCount = await getStickerCount(selectedDifficulty);
        const randomIndex = Math.floor(Math.random() * stickerCount);

        const { data: randomStickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`image_url, clubs ( id, name )`)
            .eq('difficulty', selectedDifficulty)
            .order('id', { ascending: true })
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw new Error(`Sticker fetch error: ${stickerError.message}`);
        if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker/club data.");

        const correctClubName = randomStickerData.clubs.name;
        // Use optimized image URL for faster loading
        const imageUrl = SharedUtils.getQuizImageUrl(randomStickerData.image_url);

        if (allClubNames.length < 4) {
            throw new Error("Not enough club names loaded.");
        }

        const potentialOptions = allClubNames.filter(name => name !== correctClubName);
        potentialOptions.sort(() => 0.5 - Math.random());
        const incorrectOptions = potentialOptions.slice(0, 3);

        if (incorrectOptions.length < 3) {
            throw new Error("Failed to get 3 distinct incorrect options.");
        }

        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());

        // Preload and decode image for smooth display
        try {
            await preloadImage(imageUrl);
        } catch (imgError) {
            console.warn('Image preload failed, will try again on display:', imgError);
            // Don't fail the question - image might still load on display
        }

        return {
            imageUrl: imageUrl,
            options: allOptions,
            correctAnswer: correctClubName,
            clubId: randomStickerData.clubs.id
        };
    } catch (error) {
        console.error("Error in loadNewQuestionInternal:", error);
        return null;
    }
}

async function loadNewQuestion(isQuickTransition = false) {
    if (!supabaseClient) {
        showError("DB connection error.");
        return null;
    }

    if (selectedDifficulty === null) {
        showError("No difficulty selected.");
        return null;
    }

    if (!clubNamesLoaded) {
        showLoading();
        const loaded = await loadAllClubNames();
        hideLoading();
        if (!loaded) {
            showError("Failed to load essential game data.");
            return null;
        }
    }

    // Try to get from preload queue first
    const preloadedQuestion = getPreloadedQuestion();
    if (preloadedQuestion) {
        return preloadedQuestion;
    }

    // Fallback: load directly
    if (!isQuickTransition) showLoading();
    hideError();

    try {
        const questionData = await loadNewQuestionInternal();
        if (!questionData) {
            throw new Error("Failed to load question data");
        }
        return questionData;
    } catch (error) {
        console.error("Error loadNewQuestion:", error);
        showError(`Loading Error: ${error.message || 'Failed to load question'}`);
        return null;
    } finally {
        hideLoading();
    }
}

// Load new question for TTR mode with difficulty based on pattern
async function loadNewQuestionTTR(isQuickTransition = false) {
    if (!supabaseClient) {
        showError("DB connection error.");
        return null;
    }

    if (!clubNamesLoaded) {
        showLoading();
        const loaded = await loadAllClubNames();
        hideLoading();
        if (!loaded) {
            showError("Failed to load essential game data.");
            return null;
        }
    }

    // Get difficulty based on current TTR pattern position
    const difficulty = getTTRDifficulty(ttrStickerIndex);
    currentStickerDifficulty = difficulty;

    if (!isQuickTransition) showLoading();
    hideError();

    try {
        const questionData = await loadNewQuestionInternalWithDifficulty(difficulty);
        if (!questionData) {
            throw new Error("Failed to load question data");
        }
        // Store the difficulty in the question data for scoring
        questionData.difficulty = difficulty;
        return questionData;
    } catch (error) {
        console.error("Error loadNewQuestionTTR:", error);
        showError(`Loading Error: ${error.message || 'Failed to load question'}`);
        return null;
    } finally {
        hideLoading();
    }
}

// Internal function to load question with specific difficulty (used by TTR mode)
async function loadNewQuestionInternalWithDifficulty(difficulty) {
    if (!supabaseClient) {
        return null;
    }

    if (!clubNamesLoaded) {
        const loaded = await loadAllClubNames();
        if (!loaded) {
            return null;
        }
    }

    try {
        const stickerCount = await getStickerCount(difficulty);
        const randomIndex = Math.floor(Math.random() * stickerCount);

        const { data: randomStickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`image_url, clubs ( id, name )`)
            .eq('difficulty', difficulty)
            .order('id', { ascending: true })
            .range(randomIndex, randomIndex)
            .single();

        if (stickerError) throw new Error(`Sticker fetch error: ${stickerError.message}`);
        if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker/club data.");

        const correctClubName = randomStickerData.clubs.name;
        const imageUrl = SharedUtils.getQuizImageUrl(randomStickerData.image_url);

        if (allClubNames.length < 4) {
            throw new Error("Not enough club names loaded.");
        }

        const potentialOptions = allClubNames.filter(name => name !== correctClubName);
        potentialOptions.sort(() => 0.5 - Math.random());
        const incorrectOptions = potentialOptions.slice(0, 3);

        if (incorrectOptions.length < 3) {
            throw new Error("Failed to get 3 distinct incorrect options.");
        }

        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());

        try {
            await preloadImage(imageUrl);
        } catch (imgError) {
            console.warn('Image preload failed, will try again on display:', imgError);
        }

        return {
            imageUrl: imageUrl,
            options: allOptions,
            correctAnswer: correctClubName,
            clubId: randomStickerData.clubs.id,
            difficulty: difficulty
        };
    } catch (error) {
        console.error("Error in loadNewQuestionInternalWithDifficulty:", error);
        return null;
    }
}

// ----- 11. End Game & Score Functions -----
async function getUserRankForToday(userId, score, difficulty) {
    if (!supabaseClient || !userId || score === 0) return null;

    try {
        const { startOfDay, startOfNextDay } = SharedUtils.getTodayRangeUTC();

        const { count, error } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .eq('difficulty', difficulty)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', startOfNextDay.toISOString())
            .gt('score', score);

        if (error) throw error;

        return (count || 0) + 1;
    } catch (error) {
        console.error('Error getting user rank:', error);
        return null;
    }
}

// Get user's personal rank (among their own scores for this difficulty, all time)
async function getUserPersonalRank(userId, score, difficulty) {
    if (!supabaseClient || !userId || score === 0) return null;

    try {
        const { count, error } = await supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('difficulty', difficulty)
            .gt('score', score);

        if (error) throw error;

        return (count || 0) + 1;
    } catch (error) {
        console.error('Error getting personal rank:', error);
        return null;
    }
}

// Get rank for a specific timeframe (today, week, month, all)
async function getRankForTimeframe(score, difficulty, timeframe) {
    if (!supabaseClient || score === 0) return null;

    try {
        const { fromDate, toDate } = SharedUtils.calculateTimeRange(timeframe);

        let query = supabaseClient
            .from('scores')
            .select('*', { count: 'exact', head: true })
            .eq('difficulty', difficulty)
            .gt('score', score);

        if (fromDate) query = query.gte('created_at', fromDate);
        if (toDate) query = query.lt('created_at', toDate);

        const { count, error } = await query;

        if (error) throw error;

        return (count || 0) + 1;
    } catch (error) {
        console.error(`Error getting rank for ${timeframe}:`, error);
        return null;
    }
}

// Get all timeframe ranks in parallel
async function getAllTimeframeRanks(score, difficulty) {
    const [todayRank, weekRank, monthRank, allTimeRank] = await Promise.all([
        getRankForTimeframe(score, difficulty, 'today'),
        getRankForTimeframe(score, difficulty, 'week'),
        getRankForTimeframe(score, difficulty, 'month'),
        getRankForTimeframe(score, difficulty, 'all')
    ]);

    return { todayRank, weekRank, monthRank, allTimeRank };
}

// Calculate percentile rank among all unique players' best scores (all time)
async function getPercentileRank(score, difficulty) {
    if (!supabaseClient || score === 0) return 0;

    try {
        // Fetch all scores for this difficulty
        const { data, error } = await supabaseClient
            .from('scores')
            .select('user_id, score')
            .eq('difficulty', difficulty);

        if (error) throw error;
        if (!data || data.length === 0) return 0;

        // Group by user_id and get best score for each player
        const bestScoresByPlayer = {};
        data.forEach(entry => {
            const userId = entry.user_id;
            if (!bestScoresByPlayer[userId] || entry.score > bestScoresByPlayer[userId]) {
                bestScoresByPlayer[userId] = entry.score;
            }
        });

        // Get array of best scores
        const bestScores = Object.values(bestScoresByPlayer);
        const totalPlayers = bestScores.length;

        if (totalPlayers === 0) return 0;

        // Count how many players have a lower best score than current score
        const playersWithLowerScore = bestScores.filter(s => s < score).length;

        // Calculate percentile (percentage of players beaten)
        const percentile = Math.round((playersWithLowerScore / totalPlayers) * 100);

        return percentile;
    } catch (error) {
        console.error('Error calculating percentile rank:', error);
        return 0;
    }
}

function endGame() {
    stopTimer();

    // Clear preload queue to prevent memory leak
    preloadQueue = [];
    nextQuestionPromise = null;

    // Reset TTR-specific state
    ttrTimerPaused = false;

    // Show body class to indicate quiz is over (for hiding header/footer on mobile)
    document.body.classList.remove('quiz-active', 'ttr-mode');
    document.body.classList.add('quiz-result');

    if (finalScoreElement) {
        finalScoreElement.textContent = currentScore;
    }

    // Animate Game Over text
    if (gameOverTextElement) {
        gameOverTextElement.classList.remove('game-over-animated');
        void gameOverTextElement.offsetWidth;
        gameOverTextElement.classList.add('game-over-animated');
    }

    // Switch from game panel to result panel (sticker stays in place)
    if (gameRightPanelElement) gameRightPanelElement.style.display = 'none';
    if (resultRightPanelElement) resultRightPanelElement.style.display = 'flex';

    if (resultSignInButton) {
        resultSignInButton.style.display = currentUser ? 'none' : 'inline-block';
    }

    if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';

    // Update sticker info button to link to the failed club's page
    if (resultStickerInfoButton && currentQuestionData && currentQuestionData.clubId) {
        resultStickerInfoButton.href = `/catalogue.html?club_id=${currentQuestionData.clubId}`;
    } else if (resultStickerInfoButton) {
        resultStickerInfoButton.href = '/catalogue.html';
    }

    // Calculate and display percentile rank
    if (percentileValueElement) {
        getPercentileRank(currentScore, selectedDifficulty).then(percentile => {
            if (percentileValueElement) {
                percentileValueElement.textContent = percentile;
            }
        });
    }

    // Set up leaderboard button to navigate to leaderboard
    const leaderboardButton = document.getElementById('result-leaderboard-button');
    if (leaderboardButton) {
        leaderboardButton.onclick = () => window.location.href = '/leaderboard.html';
    }

    saveScore();
}

async function saveScore() {
    if (!currentUser) return;
    if (typeof currentScore !== 'number' || currentScore < 0) return;
    if (currentScore === 0) return;

    // For TTR mode, difficulty is null (mixed)
    const difficultyToSave = currentGameMode === SharedUtils.CONFIG.GAME_MODE_TTR ? null : selectedDifficulty;
    if (currentGameMode === SharedUtils.CONFIG.GAME_MODE_CLASSIC && selectedDifficulty === null) return;

    showLoading();

    try {
        const { error } = await supabaseClient
            .from('scores')
            .insert({
                user_id: currentUser.id,
                score: currentScore,
                difficulty: difficultyToSave,
                game_mode: currentGameMode,
                country_code: null
            });

        if (error) throw error;
    } catch (error) {
        console.error("Error saving score:", error);
        showError(`Failed to save score: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// ----- 12. Leaderboard Logic -----
async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) {
        showError("DB connection error.");
        return null;
    }

    showLoading();
    hideError();

    try {
        const { fromDate, toDate } = SharedUtils.calculateTimeRange(timeframe);

        let query = supabaseClient
            .from('scores')
            .select(`score, created_at, user_id, profiles ( username )`)
            .eq('difficulty', difficulty);

        if (fromDate) query = query.gte('created_at', fromDate);
        if (toDate) query = query.lt('created_at', toDate);

        query = query
            .order('score', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(SharedUtils.CONFIG.LEADERBOARD_LIMIT);

        const { data, error } = await query;

        if (error) throw error;

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

        // Create link to player profile
        const usernameLink = document.createElement('a');
        usernameLink.href = `/profile.html?id=${entry.user_id}`;
        usernameLink.className = 'player-link';
        usernameLink.textContent = username;

        li.appendChild(usernameLink);
        li.appendChild(document.createTextNode(` - ${entry.score}`));

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

function openLeaderboard() {
    hideError();

    if (!leaderboardSectionElement || !landingPageElement || !gameAreaElement || !difficultySelectionElement || !introTextElement) {
        handleCriticalError("UI Error opening leaderboard.");
        return;
    }

    if (gameAreaElement) gameAreaElement.style.display = 'none';
    if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (landingPageElement) landingPageElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
    if (playerStatsElement) playerStatsElement.style.display = 'none';

    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';

    updateLeaderboard();
}

function closeLeaderboard() {
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
    updateAuthStateUI(currentUser);
}

// ----- 13. Helper Functions -----
function showError(message) {
    console.error("Game Error:", message);
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

function handleCriticalError(message) {
    console.error("Critical Error:", message);
    stopTimer();
    SharedUtils.stopSessionValidation();
    document.body.innerHTML = `<div style="text-align: center; padding: 50px; font-family: sans-serif;">
        <h1>Application Error</h1>
        <p>${message}</p>
        <p>Please try <a href="javascript:location.reload()">refreshing the page</a>.</p>
    </div>`;
}

function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// ----- 14. App Initialization -----
/**
 * Main app initialization
 * CRITICAL FIX for mobile auth:
 * 1. Initialize DOM elements first
 * 2. Get current session with getSession() - this is the source of truth
 * 3. Set up auth listener AFTER processing initial session
 * 4. Ignore INITIAL_SESSION in listener to avoid double-processing
 *
 * The order is important: getSession() -> setupAuthStateListener()
 * This ensures we don't have race conditions where listener fires before we process the session
 */
function initializeApp() {
    hideLoading();

    // Step 1: Initialize DOM elements
    if (!initializeDOMElements()) {
        return;
    }

    // Step 2: Load game data in background (independent of auth)
    loadAllClubNames().then(success => {
        if (!success) {
            showError("Error loading game data.");
        }
    });

    // Pre-cache sticker counts
    Promise.all([
        getStickerCount(1).catch(() => {}),
        getStickerCount(2).catch(() => {}),
        getStickerCount(3).catch(() => {})
    ]);

    // Step 3: Get current session FIRST, then set up listener
    // This order is CRITICAL for mobile - getSession() must be processed before
    // we set up the listener, otherwise INITIAL_SESSION could cause race conditions
    supabaseClient.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error) {
            console.error("Error getting session:", error);
            updateAuthStateUI(null);
            // Still set up listener for future auth changes
            setupAuthStateListener();
            return;
        }

        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile immediately for fast UI
            const cachedProfile = SharedUtils.loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
            }

            // Update UI with cached data first
            updateAuthStateUI(user);

            // Fetch fresh profile in background and update UI again
            checkAndCreateUserProfile(user).then(() => {
                updateAuthStateUI(user);
            }).catch(err => {
                console.error("Profile load error:", err);
            });

            // Start session validation
            SharedUtils.startSessionValidation(
                supabaseClient,
                () => currentUser,
                () => currentUserProfile,
                async () => {
                    await supabaseClient.auth.signOut();
                    showError("You've been logged in on another device. Please log in again.");
                }
            );
        } else {
            updateAuthStateUI(null);
        }

        // Step 4: NOW set up auth listener for FUTURE changes (logout, token refresh, etc.)
        // This is set up AFTER processing initial session to avoid race conditions
        setupAuthStateListener();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        SharedUtils.stopSessionValidation();
        stopTimer();
    });
}
