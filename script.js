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

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton;
let showLeaderboardHeaderButton;
let userNicknameElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton;
let scoreDisplayElement;
let landingPageElement, landingLoginButton, landingLeaderboardButton;
let introTextElement;

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

// Helper function to truncate strings
function truncateString(str, num = 12) { if (!str) return ''; if (str.length <= num) { return str; } return str.slice(0, num) + '...'; }

// Initialize DOM Elements
function initializeDOMElements() {
    gameAreaElement = document.getElementById('game-area'); stickerImageElement = document.getElementById('sticker-image'); optionsContainerElement = document.getElementById('options'); timeLeftElement = document.getElementById('time-left'); currentScoreElement = document.getElementById('current-score'); scoreDisplayElement = document.getElementById('score'); resultAreaElement = document.getElementById('result-area'); finalScoreElement = document.getElementById('final-score'); playAgainButton = document.getElementById('play-again'); authSectionElement = document.getElementById('auth-section'); loginButton = document.getElementById('login-button'); userStatusElement = document.getElementById('user-status'); userNicknameElement = document.getElementById('user-nickname'); logoutButton = document.getElementById('logout-button'); difficultySelectionElement = document.getElementById('difficulty-selection'); loadingIndicator = document.getElementById('loading-indicator'); errorMessageElement = document.getElementById('error-message'); difficultyButtons = document.querySelectorAll('.difficulty-option .difficulty-button'); leaderboardSectionElement = document.getElementById('leaderboard-section'); leaderboardListElement = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button'); showLeaderboardHeaderButton = document.getElementById('show-leaderboard-header-button'); leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter'); leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter'); editNicknameForm = document.getElementById('edit-nickname-form'); nicknameInputElement = document.getElementById('nickname-input'); cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button'); landingPageElement = document.getElementById('landing-page'); landingLoginButton = document.getElementById('landing-login-button'); landingLeaderboardButton = document.getElementById('landing-leaderboard-button'); introTextElement = document.getElementById('intro-text-element');
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, scoreDisplayElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardHeaderButton, loadingIndicator, errorMessageElement, editNicknameForm, nicknameInputElement, cancelEditNicknameButton, landingPageElement, landingLoginButton, landingLeaderboardButton, introTextElement }; let allFound = true; for (const key in elements) { if (!elements[key]) { const idName = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('-element', '').replace('-button', '').replace('-display', ''); console.error(`Error: Could not find DOM element with expected ID near '${idName}'! Check HTML.`); allFound = false; } } if (!difficultyButtons || difficultyButtons.length !== 3) { console.error(`Error: Found ${difficultyButtons?.length || 0} difficulty buttons, expected 3! Check selector '.difficulty-option .difficulty-button'.`); allFound = false; } if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; } if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; } if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); handleCriticalError("UI Error: Missing page elements."); return false; }

    // --- Add Event Listeners ---
    playAgainButton.addEventListener('click', showDifficultySelection); loginButton.addEventListener('click', loginWithGoogle); landingLoginButton.addEventListener('click', loginWithGoogle); logoutButton.addEventListener('click', logout); difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); }); if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.addEventListener('click', openLeaderboard); if (landingLeaderboardButton) landingLeaderboardButton.addEventListener('click', openLeaderboard); closeLeaderboardButton.addEventListener('click', closeLeaderboard); leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); }); leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); }); userNicknameElement.addEventListener('click', showNicknameEditForm); editNicknameForm.addEventListener('submit', handleNicknameSave); cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);

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
    // --------------------------------------

    console.log("DOM elements initialized."); return true;
}

// --- Function: Load All Club Names ---
async function loadAllClubNames() { if (clubNamesLoaded) { console.log("Club names loaded."); return true; } if (!supabaseClient) { return false; } console.log("Loading all club names..."); try { const { data, error } = await supabaseClient.from('clubs').select('name'); if (error) { throw error; } if (data) { allClubNames = data.map(club => club.name); clubNamesLoaded = true; console.log(`Loaded ${allClubNames.length} club names.`); return true; } else { throw new Error("No data for club names."); } } catch (error) { console.error("Error loading club names:", error); clubNamesLoaded = false; allClubNames = []; return false; } }

// ----- 5. Authentication Functions -----
async function loginWithGoogle() { if (!supabaseClient) return showError("Client error."); hideError(); showLoading(); try { const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } }); if (error) throw error; } catch (error) { console.error("Login error:", error); showError(`Login failed: ${error.message}`); hideLoading(); } }
async function logout() { if (!supabaseClient) { return showError("Client error."); } console.log("Signing out..."); hideError(); showLoading(); try { const { error } = await supabaseClient.auth.signOut(); if (error) { throw error; } console.log("SignOut ok."); } catch (error) { console.error("Logout error:", error); showError(`Logout failed: ${error.message || 'Unknown'}`); } finally { hideLoading(); } }
function updateAuthStateUI(user) { if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardHeaderButton || !landingPageElement || !introTextElement) { console.warn("updateAuthStateUI: Core UI elements not ready yet!"); return; } const bodyElement = document.body; hideNicknameEditForm(); if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'none'; if (resultAreaElement) resultAreaElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if (landingPageElement) landingPageElement.style.display = 'none'; if (introTextElement) introTextElement.style.display = 'none'; if (user) { bodyElement.classList.remove('logged-out'); const displayName = currentUserProfile?.username || user.email || 'Loading...'; userNicknameElement.textContent = truncateString(displayName); userStatusElement.style.display = 'flex'; loginButton.style.display = 'none'; showLeaderboardHeaderButton.style.display = 'inline-block'; if (leaderboardSectionElement?.style.display !== 'block' && gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none') { showDifficultySelection(); } } else { bodyElement.classList.add('logged-out'); currentUser = null; currentUserProfile = null; if (loginButton) loginButton.style.display = 'none'; if (userStatusElement) userStatusElement.style.display = 'none'; if (showLeaderboardHeaderButton) showLeaderboardHeaderButton.style.display = 'none'; stopTimer(); if (leaderboardSectionElement?.style.display !== 'block') { if(landingPageElement) landingPageElement.style.display = 'flex'; if(introTextElement) introTextElement.style.display = 'block'; } } }
function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }
async function checkAndCreateUserProfile(user) { if (!supabaseClient || !user) { return null; } console.log(`Checking profile for ${user.id}...`); let finalUsernameToShow = user.email || 'User'; let fetchedProfile = null; try { console.log("Fetching profile..."); let { data: profileData, error: selectError } = await supabaseClient .from('profiles') .select('id, username') .eq('id', user.id) .maybeSingle(); if (selectError && selectError.code !== 'PGRST116') { throw selectError; } console.log("Profile fetch result:", profileData); if (!profileData) { console.log(`Creating profile...`); const randomNickname = generateRandomNickname(); const { data: insertedProfile, error: insertError } = await supabaseClient .from('profiles') .insert({ id: user.id, username: randomNickname, updated_at: new Date() }) .select('id, username') .single(); if (insertError) { throw insertError; } fetchedProfile = insertedProfile; finalUsernameToShow = insertedProfile?.username || finalUsernameToShow; console.log(`Created: ${finalUsernameToShow}`); } else { fetchedProfile = profileData; finalUsernameToShow = profileData.username || finalUsernameToShow; console.log(`Exists: ${finalUsernameToShow}`); } currentUserProfile = fetchedProfile; return finalUsernameToShow; } catch (error) { console.error("checkAndCreateUserProfile error:", error); showError(`Profile Error: ${error.message || 'Load failed'}`); currentUserProfile = null; return user.email || 'User'; } }
function setupAuthStateChangeListener() { if (!supabaseClient) { return; } console.log("Setting up auth listener..."); supabaseClient.auth.onAuthStateChange(async (_event, session) => { console.log(`Auth Event: ${_event}`); const user = session?.user ?? null; if (user) { currentUser = user; if (!currentUserProfile || currentUserProfile.id !== user.id) { if (_event === 'SIGNED_IN') showLoading(); await checkAndCreateUserProfile(user); if (_event === 'SIGNED_IN') hideLoading(); } updateAuthStateUI(user); } else { if (_event === 'SIGNED_OUT') { currentUserProfile = null; console.log("Signed out."); } currentUser = null; updateAuthStateUI(null); } }); console.log("Auth listener set up."); }
async function checkInitialAuthState() { if (!supabaseClient) { return; }; console.log("Checking initial auth..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial session:", currentUser ? currentUser.id : "None"); } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; } }
function showNicknameEditForm() { if (!currentUserProfile || !userNicknameElement || !editNicknameForm || !nicknameInputElement) { return; } hideError(); nicknameInputElement.value = currentUserProfile.username || ''; editNicknameForm.style.display = 'block'; nicknameInputElement.focus(); nicknameInputElement.select(); }
function hideNicknameEditForm() { if (!editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = ''; }
async function handleNicknameSave(event) { event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("3-25 chars needed."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError(); try { const { data: updatedData, error } = await supabaseClient .from('profiles') .update({ username: newNickname, updated_at: new Date() }) .eq('id', currentUser.id) .select('username') .single(); if (error) throw error; console.log("Nickname updated:", updatedData); currentUserProfile.username = updatedData.username; if (userNicknameElement) { userNicknameElement.textContent = truncateString(updatedData.username); } hideNicknameEditForm(); showError("Nickname updated!"); setTimeout(hideError, 2500); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Update failed: ${error.message}`); } finally { hideLoading(); } }

// ----- 6. Display Question Function -----
function displayQuestion(questionData) { if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { showError("Error displaying question."); endGame(); return; } currentQuestionData = questionData; hideError(); if (stickerImageElement) { stickerImageElement.classList.remove('fade-in'); void stickerImageElement.offsetWidth; } stickerImageElement.src = questionData.imageUrl; stickerImageElement.alt = "Club Sticker"; if (stickerImageElement) { stickerImageElement.classList.add('fade-in'); } stickerImageElement.onerror = () => { console.error(`Error loading image AFTER preload: ${questionData.imageUrl}`); showError("Failed to display image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.className = 'btn'; button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { showError("Error displaying options."); setTimeout(endGame, 500); return; } timeLeft = 10; if(timeLeftElement) { timeLeftElement.textContent = timeLeft; timeLeftElement.classList.remove('low-time'); /* Ð¡ÐºÐ¸Ð´Ð°Ñ”Ð¼Ð¾ Ñ‡ÐµÑ€Ð²Ð¾Ð½Ð¸Ð¹ ÐºÐ¾Ð»Ñ–Ñ€ */ } if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer(); }

// ----- 7. Handle User Answer Function -----
async function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; let selectedButton = null; let correctButton = null; buttons.forEach(button => { if (button.textContent === selectedOption) { selectedButton = button; } if (button.textContent === currentQuestionData.correctAnswer) { correctButton = button; } }); if (isCorrect) { currentScore++; if (currentScoreElement) currentScoreElement.textContent = currentScore; if (scoreDisplayElement) { scoreDisplayElement.classList.remove('score-updated'); void scoreDisplayElement.offsetWidth; scoreDisplayElement.classList.add('score-updated'); } if (selectedButton) { selectedButton.classList.add('correct-answer'); } console.log("Correct: Preloading..."); let nextQuestionPromise = loadNewQuestion(true); console.log("Waiting 1.5s..."); await new Promise(resolve => setTimeout(resolve, 1500)); if (selectedButton) { selectedButton.classList.remove('correct-answer'); } console.log("Waiting 0.5s..."); await new Promise(resolve => setTimeout(resolve, 500)); try { console.log("Waiting preload finish..."); const questionData = await nextQuestionPromise; console.log("Preload finished."); if (questionData) { displayQuestion(questionData); } else { console.error("Correct: Failed preload."); endGame(); } } catch (error) { console.error("Correct: Error awaiting preload:", error); endGame(); } } else { if (selectedButton) { selectedButton.classList.add('incorrect-answer'); } if (correctButton) { correctButton.classList.add('correct-answer'); } console.log("Incorrect: Waiting 1.5s..."); await new Promise(resolve => setTimeout(resolve, 1500)); if (selectedButton) { selectedButton.classList.remove('incorrect-answer'); } if (correctButton) { correctButton.classList.remove('correct-answer'); } console.log("Incorrect: Waiting 0.5s..."); await new Promise(resolve => setTimeout(resolve, 500)); endGame(); } }

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
function showDifficultySelection() { hideError(); if (!difficultySelectionElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement || !landingPageElement || !introTextElement ) { if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(landingPageElement) landingPageElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; if(introTextElement) introTextElement.style.display = 'block'; console.log("Showing difficulty selection."); }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty ${selectedDifficulty} selected.`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; startGame(); }
async function startGame() { hideError(); if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(landingPageElement) landingPageElement.style.display = 'none'; console.log(`Starting game: Diff ${selectedDifficulty}`); await loadNextQuestion(); }
async function loadNextQuestion(isQuickTransition = false) { const questionData = await loadNewQuestion(isQuickTransition); if (questionData) { displayQuestion(questionData); } else { console.error("loadNextQuestion: Failed. Ending game."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { resultAreaElement.style.display = 'block'; if(finalScoreElement) finalScoreElement.textContent = currentScore; } if(introTextElement) introTextElement.style.display = 'block'; } }
async function loadNewQuestion(isQuickTransition = false) { if (!supabaseClient) { showError("DB connection error."); return null; } if (selectedDifficulty === null) { showError("No difficulty selected."); return null; } if (!clubNamesLoaded) { console.log("Club names not loaded..."); showLoading(); const loaded = await loadAllClubNames(); hideLoading(); if (!loaded) { showError("Failed to load essential game data."); return null; } } if (!isQuickTransition) { showLoading(); } hideError(); try { if (!supabaseClient) throw new Error("Supabase client lost."); console.log("Fetching sticker..."); const { count: stickerCount, error: countError } = await supabaseClient .from('stickers') .select('*', { count: 'exact', head: true }) .eq('difficulty', selectedDifficulty); if (countError) throw new Error(`Sticker count error: ${countError.message}`); if (stickerCount === null || stickerCount === 0) throw new Error(`No stickers for difficulty ${selectedDifficulty}.`); const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient .from('stickers') .select(`image_url, clubs ( id, name )`) .eq('difficulty', selectedDifficulty) .order('id', { ascending: true }) .range(randomIndex, randomIndex) .single(); if (stickerError) throw new Error(`Sticker fetch error: ${stickerError.message}`); if (!randomStickerData || !randomStickerData.clubs) throw new Error("Incomplete sticker/club data."); const correctClubName = randomStickerData.clubs.name; const imageUrl = randomStickerData.image_url; console.log(`Correct answer: ${correctClubName}`); if (allClubNames.length < 4) { throw new Error("Not enough club names loaded."); } const potentialOptions = allClubNames.filter(name => name !== correctClubName); potentialOptions.sort(() => 0.5 - Math.random()); const incorrectOptions = potentialOptions.slice(0, 3); if (incorrectOptions.length < 3) { throw new Error("Failed to get 3 distinct incorrect options."); } console.log("Incorrect options chosen:", incorrectOptions); const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()); const questionDataForDisplay = { imageUrl: imageUrl, options: allOptions, correctAnswer: correctClubName }; console.log(`Preloading image: ${imageUrl}`); await new Promise((resolve) => { const img = new Image(); img.onload = () => { console.log(`Image preloaded: ${imageUrl}`); resolve(); }; img.onerror = (err) => { console.error(`Failed preload: ${imageUrl}`, err); resolve(); }; img.src = imageUrl; }); console.log("Returning preloaded question data."); return questionDataForDisplay; } catch (error) { console.error("Error loadNewQuestion:", error); showError(`Loading Error: ${error.message || 'Failed to load question'}`); return null; } finally { hideLoading(); } }
function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) { finalScoreElement.textContent = currentScore; finalScoreElement.classList.remove('final-score-animated'); void finalScoreElement.offsetWidth; finalScoreElement.classList.add('final-score-animated'); } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'block'; saveScore(); }
async function saveScore() { if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { return; } console.log(`Saving score: ${currentScore}, Diff: ${selectedDifficulty}`); showLoading(); let detectedCountryCode = null; try { const { error } = await supabaseClient .from('scores') .insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay=new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate()+1); fromDate=startOfDay.toISOString(); toDate=startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate()-7); fromDate=sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate()-30); fromDate=thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate=null; toDate=null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { showError("DB connection error."); return null; } console.log(`Workspaceing leaderboard: ${timeframe}, Diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient .from('scores') .select(`score, created_at, user_id, profiles ( username )`) .eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query .order('score', { ascending: false }) .order('created_at', { ascending: true }) .limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = ''; if (!data) { leaderboardListElement.innerHTML = '<li>Error loading.</li>'; return; } if (data.length === 0) { leaderboardListElement.innerHTML = '<li>No scores found.</li>'; return; } const currentUserId = currentUser?.id; data.forEach((entry) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; const textNode = document.createTextNode(`${username} - ${entry.score}`); li.appendChild(textNode); if (currentUserId && entry.user_id === currentUserId) { li.classList.add('user-score'); } leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) return; leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !landingPageElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement || !introTextElement ) { handleCriticalError("UI Error opening leaderboard."); return; } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(landingPageElement) landingPageElement.style.display = 'none'; if(introTextElement) introTextElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }

// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); stopTimer(); document.body.innerHTML = `<h1>Application Error</h1><p>${message}</p><p>Please try refreshing the page.</p>`;}
function showLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'block'; } }
function hideLoading() { if (loadingIndicator) { loadingIndicator.style.display = 'none'; } }

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM loaded, initializing application...");
    if (!initializeDOMElements()) { return; }

    loadAllClubNames().then(success => {
        if (success) { console.log("Club names pre-loaded."); }
        else { console.error("Failed to pre-load club names."); showError("Error loading game data."); }
    });

    setupAuthStateChangeListener();
    console.log("App init finished. Waiting for auth state...");
    if(landingPageElement) landingPageElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
    if (introTextElement) introTextElement.style.display = 'none';
}

