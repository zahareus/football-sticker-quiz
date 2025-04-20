// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Initialize Supabase Client -----
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized.');
        checkInitialAuthState();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }
    } else {
         throw new Error('Supabase client library not loaded.');
    }
} catch (error) {
    console.error('Error initializing Supabase:', error);
    handleCriticalError('Error connecting to the game. Please refresh the page.');
    supabaseClient = null;
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

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade"];


// Function to find elements and attach listeners
function initializeDOMElements() {
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
    userEmailElement = document.getElementById('user-email');
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

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) { console.error(`Error: Could not find DOM element '${key.replace('Element', '')}'!`); allFound = false; }
    }
    if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
    if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { return false; } // Return false if elements are missing

    // Add event listeners
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });

    console.log("DOM elements initialized and listeners added.");
    return true;
}


// ----- 5. Authentication Functions -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Supabase client error.");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        if (error) throw error;
    } catch (error) {
        console.error("Google login error:", error);
        showError(`Login failed: ${error.message}`);
    }
}

async function logout() {
    if (!supabaseClient) return showError("Supabase client error.");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("User logged out.");
    } catch (error) {
        console.error("Logout error:", error);
        showError(`Logout failed: ${error.message}`);
    }
}

function updateAuthStateUI(user) {
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement || !showLeaderboardButton) {
       console.warn("updateAuthStateUI: DOM elements not ready!"); return;
   }
   if (user) {
       currentUser = user;
       userEmailElement.textContent = user.email || 'User';
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       showLeaderboardButton.style.display = 'inline-block';
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') {
            showDifficultySelection();
       } else {
           if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       }
   } else {
       currentUser = null;
       if (loginButton) loginButton.style.display = 'block';
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block';
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
   }
}

// Function to generate a random nickname
function generateRandomNickname() {
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
    const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
    return `${adj} ${noun}`;
}

async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`Checking/creating profile for ${user.id}...`);
   try {
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id, username').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`Profile not found. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: randomNickname, updated_at: new Date() }).select().single();
           if (insertError) throw insertError;
           console.log(`Profile created with nickname: ${insertedProfile?.username}`);
           if(userNicknameElement && insertedProfile) userNicknameElement.textContent = insertedProfile.username; // Update UI with new name
       } else {
           console.log(`Profile exists. Username: ${data.username}`);
           if(userNicknameElement && data.username) userNicknameElement.textContent = data.username; // Update UI with existing name
           else if(userNicknameElement) userNicknameElement.textContent = user.email || 'User'; // Fallback if username null
       }
   } catch (error) {
       console.error("Error checking/creating profile:", error);
       showError(`Profile Error: ${error.message}`);
   }
}

function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; }
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth Event: ${_event}`);
        const user = session?.user ?? null;
         if (loginButton) { // Check if UI is ready
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM not ready, UI update deferred.");
             currentUser = user; // Store for initializeApp
         }
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        if (_event === 'SIGNED_OUT') {
            stopTimer(); selectedDifficulty = 1; currentLeaderboardDifficulty = 1; currentLeaderboardTimeframe = 'all';
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
            if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
            if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
        }
    });
    console.log("Auth listener setup.");
}

 async function checkInitialAuthState() {
     if (!supabaseClient) { return; };
     console.log("Checking initial auth state...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         currentUser = session?.user ?? null;
         console.log("Initial auth state checked.", currentUser ? `User: ${currentUser.id}` : "No user");
     } catch (error) {
         console.error("Error getting initial session:", error);
         currentUser = null;
     }
 }

// ----- 6. Display Question Function -----
function displayQuestion(questionData) {
    if (!questionData) { console.error("displayQuestion: No data."); return; }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM elements missing!"); return;
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = "";
    stickerImageElement.alt = "Loading sticker...";
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; };

    optionsContainerElement.innerHTML = '';
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText) => {
             const button = document.createElement('button');
            button.textContent = optionText;
            button.disabled = false;
            button.classList.remove('correct-answer', 'incorrect-answer');
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
        });
    } else { console.error("Invalid options data!"); showError("Error displaying options."); setTimeout(endGame, 500); return; }

    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore; // Show current score

    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';

    startTimer();
}

// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) {
    stopTimer();
    hideError();
    if (!currentQuestionData || !optionsContainerElement) { return; }
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    const isCorrect = selectedOption === currentQuestionData.correctAnswer;
    if (isCorrect) {
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); });
        setTimeout(loadNextQuestion, 700);
    } else {
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer');
            if (button.textContent === selectedOption) button.classList.add('incorrect-answer');
        });
        setTimeout(endGame, 1500);
    }
}

 // ----- 8. Timer Functions -----
function startTimer() {
    stopTimer();
    timeLeft = 10;
    if(!timeLeftElement) { console.error("Timer Error: Time element missing!"); return; }
    timeLeftElement.textContent = timeLeft;
    timerInterval = setInterval(() => {
        timeLeft--;
        if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } }
        else { stopTimer(); return; }
        if (timeLeft <= 0) {
            stopTimer();
            if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.style.outline = '2px solid orange'; } });
             }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ----- 9. Game Flow Functions -----
function showDifficultySelection() {
     hideError();
     if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { console.error("Cannot show difficulty - elements missing"); return; }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; // Show difficulty
     if(userStatusElement) userStatusElement.style.display = 'block'; // Show status
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { return; }
     selectedDifficulty = difficulty;
     console.log(`Difficulty selected: ${selectedDifficulty}`);
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     startGame(); // Start game
}

async function startGame() {
    hideError();
    if (selectedDifficulty === null) { showDifficultySelection(); return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement || !userStatusElement) {
        console.error("startGame: Cannot start, DOM not ready."); return;
    }
    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;
    if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    if (optionsContainerElement) optionsContainerElement.innerHTML = '';
    if(userStatusElement) userStatusElement.style.display = 'none'; // Hide status during game
    await loadNextQuestion();
}

async function loadNextQuestion() {
    console.log("loadNextQuestion: Calling loadNewQuestion...");
    const questionData = await loadNewQuestion();
    if (questionData) {
        console.log("loadNextQuestion: Data received, calling displayQuestion...");
        displayQuestion(questionData); // <-- Call displayQuestion here
    } else {
        console.log("loadNextQuestion: Failed to load question data.");
        // Ensure UI reflects game end state if needed
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';
        if(userStatusElement) userStatusElement.style.display = 'block';
    }
}

 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) { return null; }
  console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); showLoading();
  try {
    const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError || stickerCount === null) throw (countError || new Error('Failed to count stickers'));
    if (stickerCount === 0) { throw new Error(`No stickers for difficulty ${selectedDifficulty}!`); }
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError || totalClubCount === null) throw (totalClubCountError || new Error('Failed to count clubs'));
    if (totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount}) in DB!`); }

    const randomIndex = Math.floor(Math.random() * stickerCount);
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers').select(`image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single();
    if (stickerError) { throw new Error(`Sticker fetch error: ${stickerError.message}`); }
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Sticker/club data missing."); }

    const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name;
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50);
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options.");
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Failed to get 3 options.");

    const questionDataForDisplay = { imageUrl: randomStickerData.image_url, options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()), correctAnswer: correctClubName };
    hideLoading();
    return questionDataForDisplay; // Return data

  } catch (error) {
    console.error("Error loading question:", error); showError(`Loading Error: ${error.message}`); hideLoading();
    setTimeout(endGame, 500); return null;
  }
}

function endGame() {
     console.log(`Game Over! Final score: ${currentScore}`); stopTimer();
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; }
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     if(userStatusElement) userStatusElement.style.display = 'block';
     saveScore();
}

 async function saveScore() {
     if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; }
     if (currentScore === 0) { console.log("Score is 0, not saving."); /* Add message to UI */ return; }
     console.log(`Attempting save: Score=${currentScore}, Diff=${selectedDifficulty}, User=${currentUser.id}`); showLoading();
     let detectedCountryCode = null;
     // --- GeoIP ---
     console.log("DEBUG: Fetching GeoIP...");
     try {
         const response = await fetch('https://ip-api.com/json/?fields=status,message,countryCode');
         console.log("DEBUG: GeoIP response status:", response.status);
         if (response.ok) {
             const data = await response.json();
             console.log("DEBUG: GeoIP data:", data);
             if (data.status === 'success' && data.countryCode) {
                 detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase();
                 console.log(`DEBUG: Country detected: ${detectedCountryCode}`);
             } else { console.warn("DEBUG: GeoIP success but no country code:", data); }
         } else { console.error("DEBUG: GeoIP fetch not ok:", response.statusText); }
     } catch (error) { console.error("DEBUG: GeoIP fetch error:", error); }
     console.log("DEBUG: GeoIP fetch finished. Country =", detectedCountryCode);
     // --- End GeoIP ---
     try {
         console.log(`Saving to DB with country: ${detectedCountryCode}`);
         const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode });
         if (error) { throw error; }
         console.log("Score saved successfully!");
         const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px;';
         if(resultAreaElement) { const p = resultAreaElement.querySelector('p'); if (p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); }
     } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); }
     finally { hideLoading(); }
 }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { return null; } console.log(`Workspaceing leaderboard: ${timeframe}, diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = ''; if (!data || data.length === 0) { leaderboardListElement.innerHTML = '<li>No results found.</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; li.textContent = `${username} - ${entry.score}`; leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { if (!btn.dataset.timeframe) return; const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { if (!btn.dataset.difficulty) return; const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !authSectionElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'none'; if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); } // Повертаємо до стану відповідно до логіну

// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); document.body.innerHTML = `<h1>Error</h1><p>${message}</p><p>Please refresh the page.</p>`; }
function showLoading() { console.log("Loading..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("...Loading finished"); if (loadingIndicator) loadingIndicator.style.display = 'none'; }

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM loaded, initializing app...");
    // Ініціалізуємо елементи і перевіряємо результат
    if (!initializeDOMElements()) {
        console.error("CRITICAL: Failed to initialize DOM elements on startup.");
        // Не викликаємо handleCriticalError, бо initializeDOMElements вже вивела помилки
        return; // Зупиняємо ініціалізацію
    }
    // Якщо елементи знайдено, продовжуємо
    setupAuthStateChangeListener(); // Налаштовуємо слухача Auth
    // Оновлюємо UI на основі currentUser (отриманого з checkInitialAuthState)
    updateAuthStateUI(currentUser);
    console.log("App initialized. Waiting for user actions.");
    // Ховаємо все зайве на старті
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    // Кнопка лідерборду має стати видимою в updateAuthStateUI
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
}
