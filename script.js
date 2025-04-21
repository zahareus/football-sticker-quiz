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
// --- New Landing Page Elements ---
let landingPageElement, landingLoginButton, landingLeaderboardButton;

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
    loginButton = document.getElementById('login-button'); // Header login (hidden when logged out)
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
    // --- Get Landing Page Elements ---
    landingPageElement = document.getElementById('landing-page');
    landingLoginButton = document.getElementById('landing-login-button');
    landingLeaderboardButton = document.getElementById('landing-leaderboard-button');


    // Updated check to include landing page elements
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, scoreDisplayElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardHeaderButton, loadingIndicator, errorMessageElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton, landingPageElement, landingLoginButton, landingLeaderboardButton };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             // Attempt to guess the ID for a more helpful error message
             const idName = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('-element', '').replace('-button', '').replace('-display', '');
             console.error(`Error: Could not find DOM element with expected ID near '${idName}'! Check HTML.`);
             allFound = false;
        }
    }
     if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
     if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
     if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); handleCriticalError("UI Error: Missing page elements."); return false; }

    // Add event listeners
    playAgainButton.addEventListener('click', showDifficultySelection);
    // Attach login handler to BOTH login buttons
    loginButton.addEventListener('click', loginWithGoogle); // Header button
    landingLoginButton.addEventListener('click', loginWithGoogle); // Landing page button
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.addEventListener('click', openLeaderboard);
    if (landingLeaderboardButton) landingLeaderboardButton.addEventListener('click', openLeaderboard); // Listener for landing page leaderboard button
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
    showLoading(); // Show loading during login attempt
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        if (error) throw error;
    } catch (error) {
        console.error("Login error:", error);
        showError(`Login failed: ${error.message}`);
        hideLoading(); // Hide loading on error
    }
    // No hideLoading() needed on success, as page redirects
}
async function logout() {
    if (!supabaseClient) { console.error("Logout error: Supabase client not initialized."); return showError("Cannot logout: Client error."); }
    console.log("Attempting to sign out..."); hideError(); showLoading();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) { console.error("Supabase signOut error:", error); throw error; }
        console.log("SignOut successful.");
        // UI update will be handled by onAuthStateChange
    } catch (error) { console.error("Logout error:", error); showError(`Logout failed: ${error.message || 'Unknown error'}`);
    } finally { hideLoading(); }
}

// Update UI based on auth state
function updateAuthStateUI(user) {
    // Check necessary elements for this function
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardHeaderButton || !landingPageElement) {
       console.warn("updateAuthStateUI: Core UI elements not ready yet!");
       return; // Don't proceed if elements crucial for showing state aren't found
   }
   hideNicknameEditForm(); // Always hide edit form

   // Hide all main content sections initially
   if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
   if (gameAreaElement) gameAreaElement.style.display = 'none';
   if (resultAreaElement) resultAreaElement.style.display = 'none';
   if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
   if (landingPageElement) landingPageElement.style.display = 'none'; // Hide landing page by default

   if (user) {
        // --- LOGGED IN STATE ---
        const displayName = currentUserProfile?.username || user.email || 'Loading...';
        userNicknameElement.textContent = truncateString(displayName);
        userStatusElement.style.display = 'flex'; // Show user status block
        loginButton.style.display = 'none'; // Hide header login button
        showLeaderboardHeaderButton.style.display = 'inline-block'; // Show header leaderboard button

        // Determine which main view to show if logged in
        // If leaderboard is already open, keep it open (do nothing here)
        if (leaderboardSectionElement?.style.display !== 'block') {
             // Otherwise, if no other game/result view is active, show difficulty selection
             if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none') {
                  showDifficultySelection(); // Show difficulty as default logged-in view
             }
             // If game or results are active, leave them visible (handled by other functions)
        }
   } else {
        // --- LOGGED OUT STATE ---
        currentUser = null; currentUserProfile = null;
        if (loginButton) loginButton.style.display = 'none'; // Keep header login hidden
        if (userStatusElement) userStatusElement.style.display = 'none'; // Hide user status block
        if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.style.display = 'none'; // Hide header leaderboard button

        // Stop game if somehow active during logout
        stopTimer();

        // Show landing page IF leaderboard is not currently open
        if (leaderboardSectionElement?.style.display !== 'block') {
             if(landingPageElement) landingPageElement.style.display = 'flex'; // Show landing page
        }
   }
}

function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }

async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) { console.error("checkAndCreateUserProfile: Invalid client or user."); return null; } // Return null on failure
   console.log(`checkAndCreateUserProfile for user ${user.id}...`);
   let finalUsernameToShow = user.email || 'User'; // Fallback
   let fetchedProfile = null; // Store fetched/created profile here

   try {
       console.log("Attempting to fetch profile from Supabase...");
       let { data: profileData, error: selectError } = await supabaseClient .from('profiles') .select('id, username') .eq('id', user.id) .maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') { console.error("Supabase profile select error:", selectError); throw selectError; }
       console.log("Profile fetch result:", profileData);

       if (!profileData) {
           console.log(`Profile not found for user ${user.id}. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient .from('profiles') .insert({ id: user.id, username: randomNickname, updated_at: new Date() }) .select('id, username') .single();
           if (insertError) { console.error("Supabase profile insert error:", insertError); throw insertError; }
           fetchedProfile = insertedProfile; // Store created profile
           finalUsernameToShow = insertedProfile?.username || finalUsernameToShow;
           console.log(`Profile created with nickname: ${finalUsernameToShow}`);
       } else {
           fetchedProfile = profileData; // Store existing profile
           finalUsernameToShow = profileData.username || finalUsernameToShow;
           console.log(`Profile exists for user ${user.id}. Username: ${finalUsernameToShow}`);
       }
       currentUserProfile = fetchedProfile; // Update global cache ONLY on success
       return finalUsernameToShow; // Return username for UI update

   } catch (error) {
       console.error("Error during checkAndCreateUserProfile:", error);
       showError(`Profile Error: ${error.message || 'Could not load profile.'}`);
       currentUserProfile = null; // Ensure cache is null on error
       return user.email || 'User'; // Return fallback on error
   }
}


// Auth State Change Listener Setup (Refactored)
function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; }
    console.log("Setting up onAuthStateChange listener...");

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth Event: ${_event}, Session: ${session ? 'Exists' : 'Null'}`);
        const user = session?.user ?? null;

        if (user) {
            // User is present (SIGNED_IN or session already exists)
            currentUser = user; // Update global user immediately
            if (!currentUserProfile || currentUserProfile.id !== user.id) { // Fetch profile only if not cached or different user
                if (_event === 'SIGNED_IN') showLoading(); // Show loading only on explicit sign-in event while fetching profile
                await checkAndCreateUserProfile(user);
                if (_event === 'SIGNED_IN') hideLoading();
            }
            // Update UI after potential profile check
            updateAuthStateUI(user);
        } else {
            // User is null (SIGNED_OUT or initial load without session)
            if (_event === 'SIGNED_OUT') {
                currentUserProfile = null; // Clear cache on sign out
                console.log("User signed out, clearing profile cache.");
            }
             currentUser = null; // Ensure global user is null
             updateAuthStateUI(null); // Update UI for logged-out state
        }
    });
    console.log("onAuthStateChange listener setup complete.");
}


async function checkInitialAuthState() {
    if (!supabaseClient) { return; }; console.log("Checking initial auth state..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial session checked.", currentUser ? `User: ${currentUser.id}` : "No session"); /* Profile fetch now handled by onAuthStateChange */ } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; }
}
// ----- 5.5 Nickname Editing Functions -----
function showNicknameEditForm() { if (!currentUserProfile || !userNicknameElement || !editNicknameForm || !nicknameInputElement) { return; } console.log("Showing nickname edit form."); hideError(); nicknameInputElement.value = currentUserProfile.username || ''; editNicknameForm.style.display = 'block'; nicknameInputElement.focus(); nicknameInputElement.select(); }
function hideNicknameEditForm() { if (!editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = ''; }
async function handleNicknameSave(event) { event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save nickname."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("Nickname must be 3-25 characters."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError(); try { const { data: updatedData, error } = await supabaseClient .from('profiles') .update({ username: newNickname, updated_at: new Date() }) .eq('id', currentUser.id) .select('username') .single(); if (error) throw error; console.log("Nickname updated:", updatedData); currentUserProfile.username = updatedData.username; if (userNicknameElement) { userNicknameElement.textContent = truncateString(updatedData.username); } hideNicknameEditForm(); showError("Nickname updated!"); setTimeout(hideError, 2500); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Update failed: ${error.message}`); } finally { hideLoading(); } }

// ----- 6. Display Question Function -----
function displayQuestion(questionData) { if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { console.error("displayQuestion: Missing elements/data."); showError("Error displaying question."); endGame(); return; } currentQuestionData = questionData; hideError(); stickerImageElement.src = ""; stickerImageElement.alt = "Loading sticker..."; stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; }; optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.className = 'btn'; button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { console.error("Invalid options:", questionData.options); showError("Error displaying options."); setTimeout(endGame, 500); return; } timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer(); }

// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; if (isCorrect) { currentScore++; if (currentScoreElement) currentScoreElement.textContent = currentScore; if (scoreDisplayElement) { scoreDisplayElement.classList.remove('score-updated'); void scoreDisplayElement.offsetWidth; scoreDisplayElement.classList.add('score-updated'); } buttons.forEach(button => { if (button.textContent === selectedOption) { button.classList.add('correct-answer'); } }); setTimeout(() => loadNextQuestion(true), 700); } else { buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) { button.classList.add('correct-answer'); } if (button.textContent === selectedOption) { button.classList.add('incorrect-answer'); } }); setTimeout(endGame, 1500); } }

// ----- 8. Timer Functions -----
function startTimer() { stopTimer(); timeLeft = 10; if(!timeLeftElement) { return; } timeLeftElement.textContent = timeLeft; timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } } else { stopTimer(); return; } if (timeLeft <= 0) { stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.classList.add('correct-answer'); } }); } setTimeout(endGame, 1500); } }, 1000); }
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }

// ----- 9. Game Flow Functions -----
function showDifficultySelection() { hideError(); if (!difficultySelectionElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(landingPageElement) landingPageElement.style.display = 'none'; // Hide landing page too
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; console.log("Showing difficulty selection."); }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty ${selectedDifficulty} selected.`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame(); }
async function startGame() { hideError(); if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(landingPageElement) landingPageElement.style.display = 'none'; console.log(`Starting game: Diff ${selectedDifficulty}`); await loadNextQuestion(); }

async function loadNextQuestion(isQuickTransition = false) {
    // console.log(`loadNextQuestion called (isQuickTransition: ${isQuickTransition})`);
    const questionData = await loadNewQuestion(isQuickTransition);
    if (questionData) { displayQuestion(questionData); }
    else { console.error("loadNextQuestion: Failed. Ending game."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { resultAreaElement.style.display = 'block'; if(finalScoreElement) finalScoreElement.textContent = currentScore; } }
}

async function loadNewQuestion(isQuickTransition = false) {
    if (!supabaseClient) { showError("DB connection error."); return null; }
    if (selectedDifficulty === null) { showError("No difficulty selected."); return null; }
    if (!isQuickTransition) { showLoading(); } hideError();
    try { if (!supabaseClient) throw new Error("Supabase client lost before query."); console.log("Fetching counts...");
        const { count: stickerCount, error: countError } = await supabaseClient .from('stickers') .select('*', { count: 'exact', head: true }) .eq('difficulty', selectedDifficulty);
        if (countError) throw new Error(`Sticker count error: ${countError.message}`); if (stickerCount === null || stickerCount === 0) throw new Error(`No stickers for difficulty ${selectedDifficulty}.`);
        const { count: totalClubCount, error: totalClubCountError } = await supabaseClient .from('clubs') .select('id', { count: 'exact', head: true });
        if (totalClubCountError) throw new Error(`Club count error: ${totalClubCountError.message}`); if (totalClubCount === null || totalClubCount < 4) throw new Error(`Not enough clubs (${totalClubCount})`);
        console.log("Fetching sticker..."); const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient .from('stickers') .select(`image_url, clubs ( id, name )`) .eq('difficulty', selectedDifficulty) .order('id', { ascending: true }) .range(randomIndex, randomIndex) .single();
        if (stickerError) throw new Error(`Sticker fetch error: ${stickerError.message}`); if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker/club data.");
        const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const imageUrl = randomStickerData.image_url;
        console.log("Fetching incorrect options..."); const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient .from('clubs') .select('name') .neq('id', correctClubId) .limit(50);
        if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Insufficient incorrect options.");
        const incorrectOptions = incorrectClubsData .map(club => club.name) .filter(name => name !== correctClubName) .sort(() => 0.5 - Math.random()) .slice(0, 3);
        if (incorrectOptions.length < 3) throw new Error("Failed to get 3 distinct options.");
        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
        const questionDataForDisplay = { imageUrl: imageUrl, options: allOptions, correctAnswer: correctClubName };
        return questionDataForDisplay;
    } catch (error) { console.error("Error during loadNewQuestion:", error); showError(`Loading Error: ${error.message || 'Failed to load question'}`); return null;
    } finally { hideLoading(); }
}

function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; saveScore(); }
async function saveScore() { if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { return; } console.log(`Saving score: ${currentScore}, Diff: ${selectedDifficulty}`); showLoading(); let detectedCountryCode = null; try { const { error } = await supabaseClient .from('scores') .insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); if (resultAreaElement && !resultAreaElement.querySelector('.save-message')) { const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score saved!'; scoreSavedMessage.className = 'save-message'; const p = resultAreaElement.querySelector('p.final-score-container'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); } } finally { hideLoading(); } }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay=new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate()+1); fromDate=startOfDay.toISOString(); toDate=startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate()-7); fromDate=sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate()-30); fromDate=thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate=null; toDate=null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { showError("DB connection error."); return null; } console.log(`Workspaceing leaderboard: ${timeframe}, Diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient .from('scores') .select(`score, created_at, user_id, profiles ( username )`) .eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query .order('score', { ascending: false }) .order('created_at', { ascending: true }) .limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = ''; if (!data) { leaderboardListElement.innerHTML = '<li>Error loading.</li>'; return; } if (data.length === 0) { leaderboardListElement.innerHTML = '<li>No scores found.</li>'; return; } const currentUserId = currentUser?.id; data.forEach((entry) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; const textNode = document.createTextNode(`${username} - ${entry.score}`); li.appendChild(textNode); if (currentUserId && entry.user_id === currentUserId) { li.classList.add('user-score'); } leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }

function openLeaderboard() {
    console.log("Opening leaderboard..."); hideError();
    if (!leaderboardSectionElement || !landingPageElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement ) { handleCriticalError("UI Error opening leaderboard."); return; }
    // Hide all other main views, including landing page
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(landingPageElement) landingPageElement.style.display = 'none';
    // Show leaderboard
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';
    updateLeaderboard();
}

function closeLeaderboard() {
    console.log("Closing leaderboard...");
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
    // Let updateAuthStateUI decide what to show next (landing or difficulty)
    updateAuthStateUI(currentUser);
}


// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); stopTimer(); document.body.innerHTML = `<h1>App Error</h1><p>${message}</p><p>Please try refreshing the page.</p>`;}
function showLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'block'; } }
function hideLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'none'; } }

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM fully loaded, initializing application...");
    if (!initializeDOMElements()) { return; } // Stop if elements not found
    setupAuthStateChangeListener(); // Setup listener
    // Initial UI state is set by onAuthStateChange based on initial check
    console.log("App init finished. Waiting for auth state...");
    // Hide all main sections initially, updateAuthStateUI will show the correct one
    if(landingPageElement) landingPageElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
}
