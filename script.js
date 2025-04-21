// script.js

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
        checkInitialAuthState(); // Check auth state immediately

        // Initialize app after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp(); // DOM already loaded
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
let currentUserProfile = null; // Cache for { id, username }

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton;
let showLeaderboardHeaderButton; // Header leaderboard button
let userNicknameElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton;
let scoreDisplayElement; // Target for score animation

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

// Helper function to truncate strings
function truncateString(str, num = 12) { // Default limit 12
  if (!str) return '';
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}

// Initialize DOM Elements
function initializeDOMElements() {
    gameAreaElement = document.getElementById('game-area');
    stickerImageElement = document.getElementById('sticker-image');
    optionsContainerElement = document.getElementById('options');
    timeLeftElement = document.getElementById('time-left');
    currentScoreElement = document.getElementById('current-score');
    scoreDisplayElement = document.getElementById('score');
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
    showLeaderboardHeaderButton = document.getElementById('show-leaderboard-header-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, scoreDisplayElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardHeaderButton, loadingIndicator, errorMessageElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton };
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
    logoutButton.addEventListener('click', logout); // Listener for logout
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });
    userNicknameElement.addEventListener('click', showNicknameEditForm);
    editNicknameForm.addEventListener('submit', handleNicknameSave);
    cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);

    if (scoreDisplayElement) {
        scoreDisplayElement.addEventListener('animationend', () => {
            scoreDisplayElement.classList.remove('score-updated');
        });
    }

    console.log("DOM elements initialized and listeners added successfully.");
    return true;
}

// ----- 5. Authentication Functions -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Supabase client is not initialized."); hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        if (error) throw error;
    } catch (error) { console.error("Login error:", error); showError(`Login failed: ${error.message}`); }
}

async function logout() {
    // Add check for client before attempting sign out
    if (!supabaseClient) {
        console.error("Logout error: Supabase client not initialized.");
        return showError("Cannot logout: Client error.");
    }
    console.log("Attempting to sign out...");
    hideError();
    showLoading(); // Show loading during logout process
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error("Supabase signOut error:", error);
            throw error; // Throw to handle in catch block
        }
        console.log("SignOut successful.");
        // UI update will be handled by onAuthStateChange
    } catch (error) {
        console.error("Logout error:", error);
        showError(`Logout failed: ${error.message || 'Unknown error'}`);
    } finally {
        hideLoading(); // Hide loading indicator
    }
}


// Update UI based on auth state
function updateAuthStateUI(user) {
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardHeaderButton ) {
       console.warn("updateAuthStateUI: Key DOM elements not ready yet!");
       return;
   }
   hideNicknameEditForm();
   if (user) {
       // Use cached profile username if available, otherwise fallback to email or 'Loading...'
       const displayName = currentUserProfile?.username || user.email || 'Loading...';
       userNicknameElement.textContent = truncateString(displayName); // Truncate name
       userStatusElement.style.display = 'flex';
       loginButton.style.display = 'none';
       showLeaderboardHeaderButton.style.display = 'inline-block';

       // Show difficulty selection only if no other main view is active
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') {
           showDifficultySelection();
       } else {
           if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       }
   } else {
       // User logged out
       currentUser = null; currentUserProfile = null;
       if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton is null!"); }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.style.display = 'none';

       // Stop game and hide all main sections
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
   }
}

function generateRandomNickname() {
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`;
}
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) {
        console.error("checkAndCreateUserProfile: Invalid client or user.");
        return; // Exit if client or user is invalid
   }
   console.log(`checkAndCreateUserProfile for user ${user.id}...`);
   currentUserProfile = null; // Reset cache
   let finalUsernameToShow = user.email || 'User'; // Fallback

   try {
       // Add logging before the call
       console.log("Attempting to fetch profile from Supabase...");
       let { data: profileData, error: selectError } = await supabaseClient
           .from('profiles')
           .select('id, username')
           .eq('id', user.id)
           .maybeSingle();

       // Log result or error
       if (selectError && selectError.code !== 'PGRST116') {
           console.error("Supabase profile select error:", selectError);
           throw selectError;
       }
       console.log("Profile fetch result:", profileData);

       if (!profileData) {
           console.log(`Profile not found for user ${user.id}. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient
               .from('profiles')
               .insert({ id: user.id, username: randomNickname, updated_at: new Date() })
               .select('id, username')
               .single();

           if (insertError) {
                console.error("Supabase profile insert error:", insertError);
                throw insertError;
           }
           currentUserProfile = insertedProfile;
           finalUsernameToShow = insertedProfile?.username || finalUsernameToShow;
           console.log(`Profile created with nickname: ${finalUsernameToShow}`);
       } else {
           currentUserProfile = profileData;
           finalUsernameToShow = profileData.username || finalUsernameToShow;
           console.log(`Profile exists for user ${user.id}. Username: ${finalUsernameToShow}`);
       }
        // Update cache with fetched/created profile
        currentUserProfile = profileData || insertedProfile;

   } catch (error) {
       console.error("Error during checkAndCreateUserProfile:", error);
       showError(`Profile Error: ${error.message || 'Could not load profile.'}`);
       // Don't update UI with potentially incorrect fallback here on error
       currentUserProfile = null; // Ensure cache is null
   }
    // Return the username (or fallback) so caller can update UI AFTER profile check
    return finalUsernameToShow;
}


// Auth State Change Listener Setup
function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; }
    console.log("Setting up onAuthStateChange listener...");

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth Event: ${_event}, Session: ${session ? 'Exists' : 'Null'}`);
        const user = session?.user ?? null;

        if (user) {
            // If user exists (SIGNED_IN or already logged in)
            currentUser = user; // Set global user first
            if (_event === 'SIGNED_IN') {
                showLoading(); // Show loading while profile is checked
                await checkAndCreateUserProfile(user); // Ensure profile is loaded/created
                hideLoading();
            }
            // Always update UI after potential profile check/load
            updateAuthStateUI(user);
        } else {
            // If user is null (SIGNED_OUT or initial state without session)
             // Clear profile cache immediately on sign out
            if (_event === 'SIGNED_OUT') {
                currentUserProfile = null;
                console.log("User signed out, clearing profile cache.");
            }
            updateAuthStateUI(null); // Update UI for logged-out state
        }
    });
    console.log("onAuthStateChange listener setup complete.");
}

// Check Initial Auth State on Load
async function checkInitialAuthState() {
    if (!supabaseClient) { return; };
    console.log("Checking initial auth state...");
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        // Set global user based on initial session check
        currentUser = session?.user ?? null;
        console.log("Initial session checked.", currentUser ? `User: ${currentUser.id}` : "No session");
        // We no longer fetch profile here; onAuthStateChange will handle it if needed.
    } catch (error) {
        console.error("Error getting initial session:", error);
        currentUser = null;
        currentUserProfile = null;
    }
}


// ----- 5.5 Nickname Editing Functions -----
function showNicknameEditForm() {
    if (!currentUserProfile || !userNicknameElement || !editNicknameForm || !nicknameInputElement) { return; } console.log("Showing nickname edit form."); hideError();
    nicknameInputElement.value = currentUserProfile.username || '';
    editNicknameForm.style.display = 'block'; nicknameInputElement.focus(); nicknameInputElement.select();
}
function hideNicknameEditForm() {
    if (!editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = '';
}
async function handleNicknameSave(event) {
    event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save nickname. Please ensure you are logged in."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("Nickname must be between 3 and 25 characters long."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError();
    try { const { data: updatedData, error } = await supabaseClient .from('profiles') .update({ username: newNickname, updated_at: new Date() }) .eq('id', currentUser.id) .select('username') .single(); if (error) throw error; console.log("Nickname updated successfully in DB:", updatedData); currentUserProfile.username = updatedData.username;
        if (userNicknameElement) {
            userNicknameElement.textContent = truncateString(updatedData.username);
        }
        hideNicknameEditForm(); showError("Nickname updated successfully!"); setTimeout(hideError, 2500); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Failed to update nickname: ${error.message}`); } finally { hideLoading(); }
}

// ----- 6. Display Question Function -----
function displayQuestion(questionData) {
    if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { console.error("displayQuestion: Missing elements or data."); showError("Error displaying question. Please try starting a new game."); endGame(); return; } currentQuestionData = questionData; hideError();
    stickerImageElement.src = ""; stickerImageElement.alt = "Loading sticker..."; stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load sticker image. Ending game."); stickerImageElement.alt = "Error loading image"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; };
    optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.className = 'btn'; button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { console.error("Invalid options data:", questionData.options); showError("Error displaying answer options. Ending game."); setTimeout(endGame, 500); return; }
    timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none';
    startTimer();
}

// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) {
    stopTimer(); hideError();
    if (!currentQuestionData || !optionsContainerElement) { return; }
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    const isCorrect = selectedOption === currentQuestionData.correctAnswer;
    if (isCorrect) {
        currentScore++;
        if (currentScoreElement) currentScoreElement.textContent = currentScore;
        if (scoreDisplayElement) { scoreDisplayElement.classList.remove('score-updated'); void scoreDisplayElement.offsetWidth; scoreDisplayElement.classList.add('score-updated'); }
        buttons.forEach(button => { if (button.textContent === selectedOption) { button.classList.add('correct-answer'); } });
        setTimeout(() => loadNextQuestion(true), 700); // Pass flag for quick transition
    } else {
        buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) { button.classList.add('correct-answer'); } if (button.textContent === selectedOption) { button.classList.add('incorrect-answer'); } });
        setTimeout(endGame, 1500);
    }
}

 // ----- 8. Timer Functions -----
function startTimer() {
    stopTimer(); timeLeft = 10; if(!timeLeftElement) { return; } timeLeftElement.textContent = timeLeft;
    timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } } else { stopTimer(); return; } if (timeLeft <= 0) { stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.classList.add('correct-answer'); } }); } setTimeout(endGame, 1500); } }, 1000);
}
function stopTimer() {
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ----- 9. Game Flow Functions -----
function showDifficultySelection() {
    hideError(); if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error initializing difficulty selection."); return; } }
    if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
    console.log("Showing difficulty selection screen.");
}
function handleDifficultySelection(event) {
    const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty ${selectedDifficulty} selected.`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame();
}
async function startGame() {
    hideError(); if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) { if (!initializeDOMElements()) { handleCriticalError("Failed to initialize UI for game start."); return; } }
    currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } console.log(`Starting game with difficulty: ${selectedDifficulty}`);
    await loadNextQuestion(); // First load - no flag
}

async function loadNextQuestion(isQuickTransition = false) {
    // console.log(`loadNextQuestion called (isQuickTransition: ${isQuickTransition})`);
    const questionData = await loadNewQuestion(isQuickTransition);
    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("loadNextQuestion: Failed to load question data. Ending game.");
        // Ensure UI reflects game end state even if error happened during load
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) {
             resultAreaElement.style.display = 'block';
             // Ensure final score is displayed in results if question load fails
             if(finalScoreElement) finalScoreElement.textContent = currentScore;
        }
        // UI state (like user status) should be handled correctly by updateAuthStateUI
    }
}

async function loadNewQuestion(isQuickTransition = false) {
    if (!supabaseClient) { showError("Database connection error."); return null; }
    if (selectedDifficulty === null) { showError("No difficulty selected."); return null; }

    if (!isQuickTransition) {
        showLoading(); // Show loading only if not quick transition
    }
    hideError();

    try {
        // Add check for client just before query
        if (!supabaseClient) throw new Error("Supabase client not available before query.");

        // Database query logic...
        console.log("Attempting to fetch sticker count...");
        const { count: stickerCount, error: countError } = await supabaseClient .from('stickers') .select('*', { count: 'exact', head: true }) .eq('difficulty', selectedDifficulty);
        if (countError) { console.error("Sticker count error:", countError); throw new Error(`Sticker count error: ${countError.message}`); }
        if (stickerCount === null || stickerCount === 0) throw new Error(`No stickers found for difficulty ${selectedDifficulty}.`);
        console.log(`Sticker count: ${stickerCount}`);

        console.log("Attempting to fetch club count...");
        const { count: totalClubCount, error: totalClubCountError } = await supabaseClient .from('clubs') .select('id', { count: 'exact', head: true });
        if (totalClubCountError) { console.error("Club count error:", totalClubCountError); throw new Error(`Club count error: ${totalClubCountError.message}`); }
        if (totalClubCount === null || totalClubCount < 4) throw new Error(`Not enough clubs (${totalClubCount})`);
        console.log(`Club count: ${totalClubCount}`);

        console.log("Attempting to fetch random sticker...");
        const randomIndex = Math.floor(Math.random() * stickerCount);
        const { data: randomStickerData, error: stickerError } = await supabaseClient .from('stickers') .select(`image_url, clubs ( id, name )`) .eq('difficulty', selectedDifficulty) .order('id', { ascending: true }) .range(randomIndex, randomIndex) .single();
        if (stickerError) { console.error("Sticker fetch error:", stickerError); throw new Error(`Sticker data fetch error: ${stickerError.message}`); }
        if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker or club data received.");
        console.log("Sticker fetched:", randomStickerData.image_url);

        const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const imageUrl = randomStickerData.image_url;

        console.log("Attempting to fetch incorrect clubs...");
        const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient .from('clubs') .select('name') .neq('id', correctClubId) .limit(50);
        if (incorrectClubsError) { console.error("Incorrect clubs fetch error:", incorrectClubsError); throw incorrectClubsError; }
        if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Incorrect club options fetch error or insufficient data.");
        console.log(`Workspaceed ${incorrectClubsData.length} potential incorrect options.`);

        const incorrectOptions = incorrectClubsData .map(club => club.name) .filter(name => name !== correctClubName) .sort(() => 0.5 - Math.random()) .slice(0, 3);
        if (incorrectOptions.length < 3) throw new Error("Failed to get 3 distinct incorrect options.");

        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
        const questionDataForDisplay = { imageUrl: imageUrl, options: allOptions, correctAnswer: correctClubName };
        return questionDataForDisplay;

    } catch (error) {
        console.error("Error during loadNewQuestion:", error);
        showError(`Loading Error: ${error.message || 'Failed to load question'}`);
        // Ensure loading is hidden if it was shown
        if (!isQuickTransition) { hideLoading(); }
        // Don't necessarily end the game here, let loadNextQuestion handle it
        // setTimeout(endGame, 500);
        return null; // Indicate failure
    } finally {
         // Always hide loading in finally, it handles cases where it wasn't shown
         hideLoading();
    }
}

function endGame() {
    console.log(`Game Over! Final Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; saveScore();
}
async function saveScore() {
    if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { return; } console.log(`Attempting to save score: Score=${currentScore}, Difficulty=${selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null;
    try { const { error } = await supabaseClient .from('scores') .insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved successfully to database!"); if (resultAreaElement && !resultAreaElement.querySelector('.save-message')) { const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; const p = resultAreaElement.querySelector('p.final-score-container'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error during score saving process:", error); showError(`Failed to save score: ${error.message}`); if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); } } finally { hideLoading(); }
}

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) { showError("Database connection error."); return null; } console.log(`Workspaceing leaderboard data: Timeframe=${timeframe}, Difficulty=${difficulty}`); showLoading(); hideError();
    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe);
        let query = supabaseClient .from('scores') .select(`score, created_at, user_id, profiles ( username )`) .eq('difficulty', difficulty);
        if (fromDate) { query = query.gte('created_at', fromDate); }
        if (toDate) { query = query.lt('created_at', toDate); }
        query = query .order('score', { ascending: false }) .order('created_at', { ascending: true }) .limit(10);
        const { data, error } = await query;
        if (error) { throw error; }
        return data;
    } catch (error) { console.error("Error in fetchLeaderboardData:", error); showError(`Could not load leaderboard: ${error.message}`); return null;
    } finally { hideLoading(); }
}
function displayLeaderboard(data) {
    if (!leaderboardListElement) { return; }
    leaderboardListElement.innerHTML = '';
    if (!data) { leaderboardListElement.innerHTML = '<li>Error loading data.</li>'; return; }
    if (data.length === 0) { leaderboardListElement.innerHTML = '<li>No scores found for these filters.</li>'; return; }
    const currentUserId = currentUser?.id;
    data.forEach((entry) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Anonymous';
        const textNode = document.createTextNode(`${username} - ${entry.score}`);
        li.appendChild(textNode);
        if (currentUserId && entry.user_id === currentUserId) { li.classList.add('user-score'); }
        leaderboardListElement.appendChild(li);
    });
}
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement ) { handleCriticalError("UI Error opening leaderboard."); return; } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }

// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); stopTimer(); document.body.innerHTML = `<h1>Application Error</h1><p>${message}</p><p>Please try refreshing the page. If the problem persists, contact support.</p>`;}
function showLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'block'; } }
function hideLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'none'; } }

// ----- 12. App Initialization -----
function initializeApp() { console.log("DOM fully loaded, initializing application..."); if (!initializeDOMElements()) { return; } setupAuthStateChangeListener(); /* updateAuthStateUI called by listener */ console.log("App init finished. Waiting for auth state..."); /* Removed explicit updateAuthStateUI call here */ if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; /* Log initial currentUser state handled within listener setup */ }
