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
let currentUserProfile = null; // Cache user profile {id, username}

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, /*userEmailElement,*/ logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;
// Nickname elements
let userNicknameElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton; // Save is handled via form submit


// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];


// Initialize DOM Elements (UPDATED for nickname edit)
function initializeDOMElements() {
    console.log("initializeDOMElements: Finding elements...");
    gameAreaElement = document.getElementById('game-area');
    stickerImageElement = document.getElementById('sticker-image');
    optionsContainerElement = document.getElementById('options');
    timeLeftElement = document.getElementById('time-left');
    currentScoreElement = document.getElementById('current-score');
    resultAreaElement = document.getElementById('result-area');
    finalScoreElement = document.getElementById('final-score');
    playAgainButton = document.getElementById('play-again');
    authSectionElement = document.getElementById('auth-section');
    loginButton = document.getElementById('login-button');
    userStatusElement = document.getElementById('user-status');
    userNicknameElement = document.getElementById('user-nickname'); // <-- Use the new ID
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
    // Nickname edit elements
    editNicknameButton = document.getElementById('edit-nickname-button');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Check ALL elements
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             const idName = key.replace('Element', '').replace('Button','');
             console.error(`Error: Could not find DOM element '${idName}'! Check HTML ID.`);
             allFound = false;
        }
    }
    if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
    if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); handleCriticalError("UI Error: Missing page elements."); return false; }

    // Add event listeners
    console.log("initializeDOMElements: Adding event listeners...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });
    // Nickname edit listeners
    userNicknameElement.addEventListener('click', showNicknameEditForm); // Click on nickname
    editNicknameButton.addEventListener('click', showNicknameEditForm); // Click on edit icon
    editNicknameForm.addEventListener('submit', handleNicknameSave);    // Form submission
    cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm); // Cancel button

    console.log("DOM elements initialized and listeners added successfully.");
    return true;
}


// ----- 5. Authentication Functions -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Client error."); hideError();
    try { const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } }); if (error) throw error; }
    catch (error) { console.error("Login error:", error); showError(`Login failed: ${error.message}`); }
}

async function logout() {
    if (!supabaseClient) { return showError("Client error."); }
    console.log("Attempting to sign out..."); hideError();
    try { const { error } = await supabaseClient.auth.signOut(); if (error) { throw error; } console.log("SignOut successful."); }
    catch (error) { console.error("Logout error:", error); showError(`Logout failed: ${error.message}`); }
}

// Update UI (uses userNicknameElement)
function updateAuthStateUI(user) {
   console.log("Running updateAuthStateUI. User:", user ? user.id : 'null');
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardButton || !editNicknameButton) { console.warn("updateAuthStateUI: DOM elements not ready!"); return; }
   hideNicknameEditForm(); // Always hide edit form initially

   if (user) {
       currentUser = user;
       userNicknameElement.textContent = currentUserProfile?.username || user.email || 'Loading...'; // Use cached profile name or email/loading
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       showLeaderboardButton.style.display = 'inline-block';
       editNicknameButton.style.display = 'inline-block'; // Show edit button

       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') { showDifficultySelection(); }
       else { if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; }
       console.log("UI Updated: User logged in.");
   } else {
       currentUser = null; currentUserProfile = null;
       if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton null!"); }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block';
       if (editNicknameButton) editNicknameButton.style.display = 'none'; // Hide edit button
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
       console.log("UI Updated: User logged out.");
   }
}

function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }

// Check/Create User Profile (UPDATED - caches profile, updates nickname element)
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`checkAndCreateUserProfile for ${user.id}...`);
   currentUserProfile = null; // Reset cache
   let finalUsernameToShow = user.email || 'User';
   try {
       let { data: profileData, error: selectError } = await supabaseClient.from('profiles').select('id, username').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;

       if (!profileData) {
           console.log(`Profile not found. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: randomNickname, updated_at: new Date() }).select('id, username').single();
           if (insertError) throw insertError;
           currentUserProfile = insertedProfile; // Cache new profile
           finalUsernameToShow = insertedProfile?.username || finalUsernameToShow;
           console.log(`Profile created with nickname: ${finalUsernameToShow}`);
       } else {
           currentUserProfile = profileData; // Cache existing profile
           finalUsernameToShow = profileData.username || finalUsernameToShow;
           console.log(`Profile exists. Username: ${finalUsernameToShow}`);
       }
       // Update UI nickname display
       if (userNicknameElement) {
           userNicknameElement.textContent = finalUsernameToShow;
       }
   } catch (error) {
       console.error("checkAndCreateUserProfile Error:", error); showError(`Profile Error: ${error.message}`);
       if (userNicknameElement) userNicknameElement.textContent = finalUsernameToShow; // Show fallback
       currentUserProfile = null;
   }
}

// Auth State Change Listener
function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; } console.log("Setting up onAuthStateChange listener...");
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth Event: ${_event}`); const user = session?.user ?? null;
         // Ensure DOM elements are ready before updating UI
         if (initializeDOMElements()) {
            updateAuthStateUI(user); // Update basic UI
            if (_event === 'SIGNED_IN' && user) {
               await checkAndCreateUserProfile(user); // Load/Create profile & update display name
            }
         } else { currentUser = user; } // Defer if DOM not ready
        if (_event === 'SIGNED_OUT') { /* Reset state */ }
    });
    console.log("onAuthStateChange listener setup complete.");
}

// Check Initial Auth State
async function checkInitialAuthState() {
    if (!supabaseClient) { return; }; console.log("Checking initial auth state...");
    try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial auth state checked.", currentUser ? `User: ${currentUser.id}` : "No user");
        // If logged in on load, fetch profile immediately
        if (currentUser) { await checkAndCreateUserProfile(currentUser); }
    } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; }
}

// ----- 5.5 Nickname Editing Functions -----
function showNicknameEditForm() {
    if (!currentUserProfile || !userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) { console.error("Cannot show edit form - elements missing or profile not loaded."); return; }
    console.log("Showing nickname edit form."); hideError();
    nicknameInputElement.value = currentUserProfile.username || ''; // Populate with current name
    userNicknameElement.style.display = 'none';
    editNicknameButton.style.display = 'none'; // Hide edit button
    editNicknameForm.style.display = 'inline-block'; // Show form
    nicknameInputElement.focus(); nicknameInputElement.select();
}

function hideNicknameEditForm() {
    if (!userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) { return; }
    editNicknameForm.style.display = 'none'; nicknameInputElement.value = '';
    if (currentUser) { userNicknameElement.style.display = 'inline'; editNicknameButton.style.display = 'inline-block'; } // Show display elements if logged in
}

async function handleNicknameSave(event) {
    event.preventDefault(); // Prevent page reload
    if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save nickname now."); return; }
    const newNickname = nicknameInputElement.value.trim();
    console.log(`Attempting to save new nickname: "${newNickname}"`);
    if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("Nickname must be 3-25 characters long."); return; }
    if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } // No change

    showLoading(); hideError();
    try {
        const { data: updatedData, error } = await supabaseClient.from('profiles').update({ username: newNickname, updated_at: new Date() }).eq('id', currentUser.id).select('username').single();
        if (error) throw error;
        console.log("Nickname updated successfully:", updatedData);
        currentUserProfile.username = updatedData.username; // Update cache
        if (userNicknameElement) { userNicknameElement.textContent = updatedData.username; } // Update UI
        hideNicknameEditForm(); // Hide form
        showError("Nickname updated successfully!"); setTimeout(hideError, 2000);
        if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } // Refresh leaderboard
    } catch (error) { console.error("Error updating nickname:", error); showError(`Failed to update nickname: ${error.message}`); }
    finally { hideLoading(); }
}


// ----- 6. Display Question Function -----
function displayQuestion(questionData) { if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { return; } currentQuestionData = questionData; hideError(); stickerImageElement.src = ""; stickerImageElement.alt = "Loading..."; stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; }; optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { console.error("Invalid options!"); showError("Error displaying options."); setTimeout(endGame, 500); return; } timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer(); }

// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; if (isCorrect) { currentScore++; if(currentScoreElement) currentScoreElement.textContent = currentScore; buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); }); setTimeout(loadNextQuestion, 700); } else { buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer'); if (button.textContent === selectedOption) button.classList.add('incorrect-answer'); }); setTimeout(endGame, 1500); } }

 // ----- 8. Timer Functions -----
function startTimer() { stopTimer(); timeLeft = 10; if(!timeLeftElement) { return; } timeLeftElement.textContent = timeLeft; timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } } else { stopTimer(); return; } if (timeLeft <= 0) { stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.style.outline = '2px solid orange'; } }); } setTimeout(endGame, 1500); } }, 1000); }
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }

// ----- 9. Game Flow Functions -----
function showDifficultySelection() { hideError(); if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame(); }
async function startGame() { hideError(); if (selectedDifficulty === null) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement || !userStatusElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(userStatusElement) userStatusElement.style.display = 'none'; await loadNextQuestion(); }
async function loadNextQuestion() { console.log("loadNextQuestion: Calling loadNewQuestion..."); const questionData = await loadNewQuestion(); if (questionData) { console.log("loadNextQuestion: Data received, calling displayQuestion..."); displayQuestion(questionData); } else { console.log("loadNextQuestion: Failed to load question data."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; } }
async function loadNewQuestion() { if (!supabaseClient || selectedDifficulty === null) { return null; } console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); showLoading(); try { const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty); if (countError || stickerCount === null) throw (countError || new Error('Failed count')); if (stickerCount === 0) { throw new Error(`No stickers for difficulty ${selectedDifficulty}!`); } const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true }); if (totalClubCountError || totalClubCount === null) throw (totalClubCountError || new Error('Failed count')); if (totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount})!`); } const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single(); if (stickerError) { throw new Error(`Sticker fetch error: ${stickerError.message}`); } if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Sticker/club data missing."); } const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options."); const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3); if (incorrectOptions.length < 3) throw new Error("Failed to get 3 options."); const questionDataForDisplay = { imageUrl: randomStickerData.image_url, options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()), correctAnswer: correctClubName }; hideLoading(); return questionDataForDisplay; } catch (error) { console.error("Error loading question:", error); showError(`Loading Error: ${error.message}`); hideLoading(); setTimeout(endGame, 500); return null; } }
function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'block'; saveScore(); }
async function saveScore() { if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; } if (currentScore === 0) { /* ... message ... */ return; } console.log(`Attempting save: Score=<span class="math-inline">\{currentScore\}, Diff\=</span>{selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null; console.log("DEBUG: Fetching GeoIP..."); try { await fetch('https://ip-api.com/json/?fields=status,message,countryCode').then(response => { /* ... */ }).then(data => { /* ... */ }).catch(fetchError => { /* ... */ }); } catch (outerError) { /* ... */ } console.log("DEBUG: GeoIP finished. Country =", detectedCountryCode); try { console.log(`Saving to DB: country=${detectedCountryCode}`); const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px;'; if(resultAreaElement) { const p = resultAreaElement.querySelector('p'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { return null; } console.log(`Workspaceing leaderboard: ${timeframe}, diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = ''; if (!data || data.length === 0) { leaderboardListElement.innerHTML = '<li>No results found.</li>'; return; } data.forEach((entry) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; li.textContent = `${username} - ${entry.score}`; leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
// Виправлено openLeaderboard
function openLeaderboard() {
    console.log("Opening leaderboard..."); hideError();
    if (!leaderboardSectionElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement || !authSectionElement) {
         if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; }
    }
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    // НЕ ХОВАЄМО userStatusElement
    if(authSectionElement && !currentUser) authSectionElement.style.display = 'none';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';
    updateLeaderboard();
}
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }

// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); document.body.innerHTML = `<h1>Error</h1><p>${message}</p><p>Please refresh the page.</p>`; }
function showLoading() { console.log("Loading..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("...Loading finished"); if (loadingIndicator) loadingIndicator.style.display = 'none'; }

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM loaded, initializing app...");
    if (!initializeDOMElements()) { console.error("CRITICAL: Failed DOM init."); return; }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser); // Оновлюємо UI початковим станом
    console.log("App initialized. Waiting for user actions.");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
}
