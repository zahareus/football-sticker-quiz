// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Initialize Supabase Client -----
if (typeof supabase === 'undefined') {
    console.error('Error: Supabase client library not loaded.');
    handleCriticalError('Error loading game. Please refresh the page.');
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');
        checkInitialAuthState(); // Перевіряємо початковий стан автентифікації

        // Чекаємо на завантаження DOM перед ініціалізацією додатку
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp(); // DOM вже завантажено
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        handleCriticalError('Error connecting to the game. Please refresh the page.');
        supabaseClient = null; // Робимо клієнт null, щоб інші функції знали про помилку
    }
}

// ----- 3. Global Game State Variables -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10; // Seconds per question
let timerInterval = null;
let currentUser = null; // Stores Supabase user object
let selectedDifficulty = 1; // Default difficulty
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;
let currentUserProfile = null; // Cache user profile {id, username}
// Removed loadingTimerId - reverting to immediate show/hide

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons; // NodeList
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons; // NodeLists
// Nickname elements
let userNicknameElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton; // Save is handled via form submit
let scoreDisplayElement; // <<<--- NEW Reference specifically for score animation target

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

// Initialize DOM Elements
function initializeDOMElements() {
    gameAreaElement = document.getElementById('game-area');
    stickerImageElement = document.getElementById('sticker-image');
    optionsContainerElement = document.getElementById('options');
    timeLeftElement = document.getElementById('time-left');
    currentScoreElement = document.getElementById('current-score');
    scoreDisplayElement = document.getElementById('score'); // <<<--- Get the parent score element
    resultAreaElement = document.getElementById('result-area');
    finalScoreElement = document.getElementById('final-score');
    playAgainButton = document.getElementById('play-again');
    authSectionElement = document.getElementById('auth-section');
    loginButton = document.getElementById('login-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname');
    logoutButton = document.getElementById('logout-button');
    difficultySelectionElement = document.getElementById('difficulty-selection');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');
    difficultyButtons = document.querySelectorAll('.difficulty-button');
    leaderboardSectionElement = document.getElementById('leaderboard-section');
    leaderboardListElement = document.getElementById('leaderboard-list');
    closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    showLeaderboardButton = document.getElementById('show-leaderboard-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    editNicknameButton = document.getElementById('edit-nickname-button');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Check ALL elements (simplified check)
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, scoreDisplayElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             const idName = key.replace('Element', '').replace('Button','').replace('Display','');
             console.error(`Error: Could not find DOM element '${idName}'! Check HTML ID.`);
             allFound = false;
        }
    }
     if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
     if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
     if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); handleCriticalError("UI Error: Missing page elements."); return false; }

    // Add event listeners
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });
    userNicknameElement.addEventListener('click', showNicknameEditForm);
    editNicknameButton.addEventListener('click', showNicknameEditForm);
    editNicknameForm.addEventListener('submit', handleNicknameSave);
    cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);

    // Add listener for score animation end
    if (scoreDisplayElement) {
        scoreDisplayElement.addEventListener('animationend', () => {
            scoreDisplayElement.classList.remove('score-updated');
        });
    }

    console.log("DOM elements initialized and listeners added successfully.");
    return true; // Indicate success
}

// ----- Authentication Functions (unchanged)-----
async function loginWithGoogle() {
    // ... (no changes)
    if (!supabaseClient) return showError("Supabase client is not initialized."); hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        if (error) throw error;
    } catch (error) { console.error("Login error:", error); showError(`Login failed: ${error.message}`); }
}
async function logout() {
    // ... (no changes)
    if (!supabaseClient) { return showError("Supabase client is not initialized."); }
    console.log("Attempting to sign out..."); hideError();
    try { const { error } = await supabaseClient.auth.signOut(); if (error) { throw error; } console.log("SignOut successful."); }
    catch (error) { console.error("Logout error:", error); showError(`Logout failed: ${error.message}`); }
}
function updateAuthStateUI(user) {
    // ... (no changes)
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardButton || !editNicknameButton) { console.warn("updateAuthStateUI: Key DOM elements not ready yet!"); return; }
   hideNicknameEditForm();
   if (user) {
       currentUser = user;
       userNicknameElement.textContent = currentUserProfile?.username || user.email || 'Loading...';
       userStatusElement.style.display = 'block'; loginButton.style.display = 'none'; showLeaderboardButton.style.display = 'block'; editNicknameButton.style.display = 'inline-block';
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') { showDifficultySelection(); }
       else { if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; }
   } else {
       currentUser = null; currentUserProfile = null;
       if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton is null!"); }
       if (userStatusElement) userStatusElement.style.display = 'none'; if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (showLeaderboardButton) showLeaderboardButton.style.display = 'block'; if (editNicknameButton) editNicknameButton.style.display = 'none';
       stopTimer(); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
   }
}
function generateRandomNickname() {
    // ... (no changes)
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`;
}
async function checkAndCreateUserProfile(user) {
    // ... (no changes)
   if (!supabaseClient || !user) return; console.log(`checkAndCreateUserProfile for user ${user.id}...`); currentUserProfile = null; let finalUsernameToShow = user.email || 'User';
   try {
       let { data: profileData, error: selectError } = await supabaseClient .from('profiles') .select('id, username') .eq('id', user.id) .maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') { throw selectError; }
       if (!profileData) {
           console.log(`Profile not found for user ${user.id}. Creating...`); const randomNickname = generateRandomNickname(); const { data: insertedProfile, error: insertError } = await supabaseClient .from('profiles') .insert({ id: user.id, username: randomNickname, updated_at: new Date() }) .select('id, username') .single();
           if (insertError) throw insertError; currentUserProfile = insertedProfile; finalUsernameToShow = insertedProfile?.username || finalUsernameToShow; console.log(`Profile created with nickname: ${finalUsernameToShow}`);
       } else { currentUserProfile = profileData; finalUsernameToShow = profileData.username || finalUsernameToShow; console.log(`Profile exists for user ${user.id}. Username: ${finalUsernameToShow}`); }
       if (userNicknameElement) { userNicknameElement.textContent = finalUsernameToShow; } else { console.warn("checkAndCreateUserProfile: userNicknameElement not found to update UI."); }
   } catch (error) { console.error("Error in checkAndCreateUserProfile:", error); showError(`Profile Error: ${error.message}`); if (userNicknameElement) { userNicknameElement.textContent = finalUsernameToShow; } currentUserProfile = null; }
}
function setupAuthStateChangeListener() {
    // ... (no changes)
    if (!supabaseClient) { return; } console.log("Setting up onAuthStateChange listener...");
    supabaseClient.auth.onAuthStateChange(async (_event, session) => { const user = session?.user ?? null; updateAuthStateUI(user); if (_event === 'SIGNED_IN' && user) { await checkAndCreateUserProfile(user); } if (_event === 'SIGNED_OUT') { console.log("User signed out, resetting state."); } if (_event === 'USER_UPDATED') { console.log("User data updated."); } });
    console.log("onAuthStateChange listener setup complete.");
}
async function checkInitialAuthState() {
    // ... (no changes)
    if (!supabaseClient) { return; }; console.log("Checking initial auth state..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial auth state checked.", currentUser ? `User logged in: ${currentUser.id}` : "No active session found."); if (currentUser) { await checkAndCreateUserProfile(currentUser); } } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; }
}
// ----- Nickname Editing Functions (unchanged) -----
function showNicknameEditForm() {
    // ... (no changes)
    if (!currentUserProfile || !userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) { return; } console.log("Showing nickname edit form."); hideError();
    nicknameInputElement.value = currentUserProfile.username || ''; editNicknameForm.style.display = 'block'; nicknameInputElement.focus(); nicknameInputElement.select();
}
function hideNicknameEditForm() {
    // ... (no changes)
    if (!editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = '';
}
async function handleNicknameSave(event) {
    // ... (no changes)
    event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save nickname. Please ensure you are logged in."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("Nickname must be between 3 and 25 characters long."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError();
    try { const { data: updatedData, error } = await supabaseClient .from('profiles') .update({ username: newNickname, updated_at: new Date() }) .eq('id', currentUser.id) .select('username') .single(); if (error) throw error; console.log("Nickname updated successfully in DB:", updatedData); currentUserProfile.username = updatedData.username; if (userNicknameElement) { userNicknameElement.textContent = updatedData.username; } hideNicknameEditForm(); showError("Nickname updated successfully!"); setTimeout(hideError, 2500); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Failed to update nickname: ${error.message}`); } finally { hideLoading(); }
}


// ----- 6. Display Question Function (unchanged) -----
function displayQuestion(questionData) {
    // ... (no changes)
    if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { console.error("displayQuestion: Missing elements or data."); showError("Error displaying question. Please try starting a new game."); endGame(); return; } currentQuestionData = questionData; hideError();
    stickerImageElement.src = ""; stickerImageElement.alt = "Loading sticker..."; stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load sticker image. Ending game."); stickerImageElement.alt = "Error loading image"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; };
    optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.className = 'btn'; button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { console.error("Invalid options data:", questionData.options); showError("Error displaying answer options. Ending game."); setTimeout(endGame, 500); return; }
    timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none';
    startTimer();
}


// ----- 7. Handle User Answer Function (Add animation trigger) -----
function handleAnswer(selectedOption) {
    stopTimer();
    hideError();

    if (!currentQuestionData || !optionsContainerElement) {
        console.error("handleAnswer: Missing question data or options container.");
        return;
    }

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    const isCorrect = selectedOption === currentQuestionData.correctAnswer;

    if (isCorrect) {
        currentScore++;
        if (currentScoreElement) currentScoreElement.textContent = currentScore;

        // <<<--- Trigger Score Animation --- >>>
        if (scoreDisplayElement) {
             // Remove class first to allow re-triggering if animation was somehow interrupted
             scoreDisplayElement.classList.remove('score-updated');
             // Force reflow/repaint before adding class again - important for re-triggering
             void scoreDisplayElement.offsetWidth;
             scoreDisplayElement.classList.add('score-updated');
        }
        // <<<----------------------------- >>>

        buttons.forEach(button => {
            if (button.textContent === selectedOption) {
                button.classList.add('correct-answer');
            }
        });
        // --- Pass 'true' to indicate quick transition ---
        setTimeout(() => loadNextQuestion(true), 700); // Pass flag here
    } else {
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) {
                button.classList.add('correct-answer');
            }
            if (button.textContent === selectedOption) {
                button.classList.add('incorrect-answer');
            }
        });
        setTimeout(endGame, 1500);
    }
}


 // ----- 8. Timer Functions (unchanged) -----
function startTimer() {
    // ... (no changes)
    stopTimer(); timeLeft = 10; if(!timeLeftElement) { return; } timeLeftElement.textContent = timeLeft;
    timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } } else { stopTimer(); return; } if (timeLeft <= 0) { stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.classList.add('correct-answer'); } }); } setTimeout(endGame, 1500); } }, 1000);
}
function stopTimer() {
    // ... (no changes)
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}


// ----- 9. Game Flow Functions (Modify loadNextQuestion call) -----
function showDifficultySelection() {
    // ... (no changes)
    hideError(); if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error initializing difficulty selection."); return; } }
    if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
    console.log("Showing difficulty selection screen.");
}
function handleDifficultySelection(event) {
    // ... (no changes)
    const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty ${selectedDifficulty} selected.`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame();
}
async function startGame() {
    // ... (no changes) - Calls loadNextQuestion without flag
    hideError(); if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) { if (!initializeDOMElements()) { handleCriticalError("Failed to initialize UI for game start."); return; } }
    currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } console.log(`Starting game with difficulty: ${selectedDifficulty}`);
    await loadNextQuestion(); // First load - no flag needed (loading indicator is ok)
}

// --- Updated loadNextQuestion to accept and pass flag ---
async function loadNextQuestion(isQuickTransition = false) { // Default false
    console.log(`loadNextQuestion called (isQuickTransition: ${isQuickTransition})`);

    // --- Optimization: Clear old options immediately for smoother transition ---
    // if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; }

    // --- Pass the flag to loadNewQuestion ---
    const questionData = await loadNewQuestion(isQuickTransition);

    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("loadNextQuestion: Failed to load question data. Ending game.");
        if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'block'; if(finalScoreElement) finalScoreElement.textContent = currentScore;
    }
}


// --- Updated loadNewQuestion to check flag ---
async function loadNewQuestion(isQuickTransition = false) { // Accept flag
    if (!supabaseClient) { showError("Database connection error."); return null; }
    if (selectedDifficulty === null) { showError("No difficulty selected."); return null; }

    // --- Only show loading if it's NOT a quick transition ---
    if (!isQuickTransition) {
        // console.log(`Loading question (Difficulty: ${selectedDifficulty})...`);
        showLoading(); // Show loading for initial load or slow operations
    }
    hideError();

    try {
        // ... (Database query logic remains the same) ...
        const { count: stickerCount, error: countError } = await supabaseClient .from('stickers') .select('*', { count: 'exact', head: true }) .eq('difficulty', selectedDifficulty);
        if (countError || stickerCount === null || stickerCount === 0) throw new Error(`Sticker count error/missing for difficulty ${selectedDifficulty}.`);
        const { count: totalClubCount, error: totalClubCountError } = await supabaseClient .from('clubs') .select('id', { count: 'exact', head: true });
        if (totalClubCountError || totalClubCount === null || totalClubCount < 4) throw new Error(`Club count error/insufficient (${totalClubCount}).`);
        const randomIndex = Math.floor(Math.random() * stickerCount);
        const { data: randomStickerData, error: stickerError } = await supabaseClient .from('stickers') .select(`image_url, clubs ( id, name )`) .eq('difficulty', selectedDifficulty) .order('id', { ascending: true }) .range(randomIndex, randomIndex) .single();
        if (stickerError || !randomStickerData || !randomStickerData.clubs) throw new Error("Sticker data fetch error or incomplete data.");
        const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const imageUrl = randomStickerData.image_url;
        const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient .from('clubs') .select('name') .neq('id', correctClubId) .limit(50);
        if (incorrectClubsError || !incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Incorrect club options fetch error or insufficient data.");
        const incorrectOptions = incorrectClubsData .map(club => club.name) .filter(name => name !== correctClubName) .sort(() => 0.5 - Math.random()) .slice(0, 3);
        if (incorrectOptions.length < 3) throw new Error("Failed to get 3 distinct incorrect options.");
        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
        const questionDataForDisplay = { imageUrl: imageUrl, options: allOptions, correctAnswer: correctClubName };

        return questionDataForDisplay;

    } catch (error) {
        console.error("Error loading new question:", error);
        showError(`Loading Error: ${error.message}`);
        setTimeout(endGame, 500);
        return null;
    } finally {
         // --- Only hide loading if it was NOT a quick transition ---
         // (or just always call hideLoading, it handles cases where indicator isn't shown)
         hideLoading();
    }
}


function endGame() {
    // ... (no changes)
    console.log(`Game Over! Final Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; saveScore();
}
async function saveScore() {
    // ... (no changes) - Calls showLoading/hideLoading correctly
    if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { return; } console.log(`Attempting to save score: Score=${currentScore}, Difficulty=${selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null; /* GeoIP commented out */
    try { const { error } = await supabaseClient .from('scores') .insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved successfully to database!"); if (resultAreaElement && !resultAreaElement.querySelector('.save-message')) { const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; const p = resultAreaElement.querySelector('p'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error during score saving process:", error); showError(`Failed to save score: ${error.message}`); if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); } } finally { hideLoading(); }
}


// ----- 10. Leaderboard Logic (unchanged) -----
function calculateTimeRange(timeframe) { /* ... */ }
async function fetchLeaderboardData(timeframe, difficulty) {
    // ... (Calls showLoading/hideLoading correctly)
    if (!supabaseClient) { showError("Database connection error."); return null; } console.log(`Workspaceing leaderboard data: Timeframe=${timeframe}, Difficulty=${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient .from('scores') .select(`score, created_at, profiles ( username )`) .eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query .order('score', { ascending: false }) .order('created_at', { ascending: true }) .limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Error in fetchLeaderboardData:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); }
}
function displayLeaderboard(data) { /* ... */ }
function updateFilterButtonsUI() { /* ... */ }
async function updateLeaderboard() { /* ... */ }
function handleTimeFilterChange(event) { /* ... */ }
function handleDifficultyFilterChange(event) { /* ... */ }
function openLeaderboard() { /* ... */ }
function closeLeaderboard() { /* ... */ }


// ----- 11. Helper Functions (Reverted loading logic) -----
function showError(message) {
    // ... (no changes)
    console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); }
}
function hideError() {
    // ... (no changes)
    if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; }
}
function handleCriticalError(message) {
    // ... (no changes)
    console.error("Critical Error:", message); stopTimer(); document.body.innerHTML = `<h1>Application Error</h1><p>${message}</p><p>Please try refreshing the page. If the problem persists, contact support.</p>`;
}

// --- Reverted Loading Indicator Logic ---
function showLoading() {
    // console.log("Loading indicator: Show"); // Less verbose
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}
function hideLoading() {
    // console.log("Loading indicator: Hide"); // Less verbose
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}


// ----- 12. App Initialization (unchanged) -----
function initializeApp() {
    // ... (no changes)
    console.log("DOM fully loaded, initializing application..."); if (!initializeDOMElements()) { return; } setupAuthStateChangeListener(); updateAuthStateUI(currentUser); console.log("Application initialized. Current user state:", currentUser ? currentUser.id : 'Logged out'); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; console.log("App ready. Waiting for user actions or auth changes.");
}
