// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
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

// ----- 3. Глобальні змінні -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;
let currentUser = null;
let selectedDifficulty = 1;
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade"];


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
    for (const key in elements) { if (!elements[key]) { console.error(`Error: Could not find DOM element '${key.replace('Element', '')}'!`); allFound = false; } }
    if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
    if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); return false; }

    console.log("initializeDOMElements: Adding event listeners...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });

    console.log("DOM elements initialized and listeners added successfully.");
    return true;
}


// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() {
    console.log("Login function CALLED!");
    if (!supabaseClient) return showError("Supabase client not initialized.");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
        if (error) throw error;
        console.log("Redirecting to Google...");
    } catch (error) { console.error("Google login error:", error); showError(`Login failed: ${error.message}`); }
}

async function logout() {
    console.log("Logout function CALLED!");
    if (!supabaseClient) { console.error("Logout Error: Supabase client missing!"); return showError("Supabase client not initialized."); }
    console.log("Attempting to sign out...");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) { console.error("Supabase signOut error object:", error); throw error; }
        console.log("supabaseClient.auth.signOut() successful.");
    } catch (error) { console.error("Logout function error:", error); showError(`Logout failed: ${error.message}`); }
}

function updateAuthStateUI(user) {
   console.log("Running updateAuthStateUI. User:", user ? user.id : 'null');
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement || !showLeaderboardButton) { console.warn("updateAuthStateUI: DOM elements not ready!"); return; }
   // console.log("updateAuthStateUI: DOM elements ready."); // Менш важливий лог

   if (user) {
       currentUser = user;
       // console.log("updateAuthStateUI: User exists.");
       if (userEmailElement) userEmailElement.textContent = user.email || 'User'; // Показуємо email спочатку
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       showLeaderboardButton.style.display = 'inline-block';
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') {
            showDifficultySelection();
       } else { if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; }
       console.log("UI Updated: User logged in:", user.email);
   } else {
       currentUser = null;
       // console.log("updateAuthStateUI: User is null.");
       if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton null!"); }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block';
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
       console.log("UI Updated: User logged out.");
   }
}

function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }

async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`Checking/creating profile for ${user.id}...`);
   try {
       const { data: profileData, error: selectError } = await supabaseClient.from('profiles').select('id, username').eq('id', user.id).maybeSingle(); // Вибираємо і username
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       let currentUsername = null;
       if (!profileData) {
           console.log(`Profile not found. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: randomNickname, updated_at: new Date() }).select('username').single();
           if (insertError) throw insertError;
           currentUsername = insertedProfile?.username;
           console.log(`Profile created with nickname: ${currentUsername}`);
       } else {
           currentUsername = profileData.username;
           console.log(`Profile exists. Username: ${currentUsername}`);
       }
       // Оновлюємо UI нікнеймом (або email, якщо нікнейм відсутній)
       if (userEmailElement) {
           userEmailElement.textContent = currentUsername || user.email || 'User';
       }
   } catch (error) {
       console.error("Error checking/creating profile:", error);
       showError(`Profile Error: ${error.message}`);
       // Якщо профіль не створився/не завантажився, все одно покажемо email
       if (userEmailElement) userEmailElement.textContent = user.email || 'User';
   }
}

function setupAuthStateChangeListener() {
    if (!supabaseClient) { return; }
    console.log("Setting up onAuthStateChange listener...");
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth Event: ${_event}`);
        const user = session?.user ?? null;
         if (loginButton) { updateAuthStateUI(user); }
         else { console.warn("onAuthStateChange: DOM not ready"); currentUser = user; }
        if (_event === 'SIGNED_IN' && user) { await checkAndCreateUserProfile(user); }
        if (_event === 'SIGNED_OUT') { console.log("SIGNED_OUT: Resetting state."); stopTimer(); selectedDifficulty = 1; currentLeaderboardDifficulty = 1; currentLeaderboardTimeframe = 'all'; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; }
    });
    console.log("onAuthStateChange listener setup complete.");
}

 async function checkInitialAuthState() {
     if (!supabaseClient) { return; };
     console.log("Checking initial auth state...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         currentUser = session?.user ?? null;
         console.log("Initial auth state checked.", currentUser ? `User: ${currentUser.id}` : "No user");
     } catch (error) { console.error("Error getting initial session:", error); currentUser = null; }
 }

 async function fetchInitialUserProfile(user) {
     if (!supabaseClient || !user || !userEmailElement) { updateAuthStateUI(user); return; }; // Оновити UI в будь-якому випадку
     console.log("fetchInitialUserProfile: Fetching profile...");
     try {
          const { data: profile, error } = await supabaseClient.from('profiles').select('username').eq('id', user.id).maybeSingle(); // maybeSingle краще, бо профіль може не бути створений миттєво
         if (error && error.code !== 'PGRST116') { throw error; } // Ігноруємо тільки "не знайдено"
         if (profile) {
             console.log("fetchInitialUserProfile: Profile found, username:", profile.username);
             userEmailElement.textContent = profile.username || user.email || 'User';
         } else {
              console.warn("fetchInitialUserProfile: Profile not found yet.");
              userEmailElement.textContent = user.email || 'User...'; // Тимчасово email
         }
         updateAuthStateUI(user); // Оновити решту UI
     } catch(error) {
          console.error("fetchInitialUserProfile: Error:", error);
          if (userEmailElement) userEmailElement.textContent = user.email || 'User!'; // Fallback
          updateAuthStateUI(user); // Все одно оновити UI
     }
 }


// ----- 6. Функція для відображення запитання (ДОДАНО ЛОГИ В ЦИКЛ) -----
function displayQuestion(questionData) {
    console.log("--- displayQuestion START --- Data:", questionData);
    if (!questionData) { console.error("displayQuestion: No data provided."); return; }
    // Перевірка елементів на початку
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM elements not initialized!");
         if (!initializeDOMElements()) { handleCriticalError("Critical UI Init Error."); return; }
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = ""; stickerImageElement.alt = "Loading sticker...";
    console.log("displayQuestion: Setting image src:", questionData.imageUrl);
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => { /* ... */ }; stickerImageElement.onload = () => { /* ... */ };

    optionsContainerElement.innerHTML = ''; // Очищаємо кнопки
    console.log("displayQuestion: Creating buttons for options:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText, index) => {
            console.log(`displayQuestion: Loop ${index}, Option: "${optionText}"`); // ЛОГ 1: Початок ітерації
            try {
                const button = document.createElement('button');
                console.log(`displayQuestion: Loop ${index}, Button created.`); // ЛОГ 2: Кнопка створена
                button.textContent = optionText;
                console.log(`displayQuestion: Loop ${index}, Text set.`); // ЛОГ 3: Текст встановлено
                button.disabled = false;
                button.classList.remove('correct-answer', 'incorrect-answer');
                console.log(`displayQuestion: Loop ${index}, Adding listener...`); // ЛОГ 4: Перед додаванням слухача
                button.addEventListener('click', () => handleAnswer(optionText));
                console.log(`displayQuestion: Loop ${index}, Listener added. Appending...`); // ЛОГ 5: Перед додаванням до DOM
                optionsContainerElement.appendChild(button);
                console.log(`displayQuestion: Loop ${index}, Button appended.`); // ЛОГ 6: Кнопку додано
            } catch (loopError) {
                console.error(`displayQuestion: Error in button loop at index ${index} for option "${optionText}":`, loopError);
                // Можна спробувати продовжити з наступною кнопкою або зупинити все
                showError("Error creating answer buttons.");
                return; // Зупинити подальше створення кнопок
            }
        });
        console.log("displayQuestion: Button creation loop finished.");
    } else {
        console.error("Error: questionData.options is invalid!"); showError("Error displaying options.");
        setTimeout(endGame, 500); return;
    }

    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;

    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';

    startTimer(); // Запускаємо таймер ПІСЛЯ додавання кнопок
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer(); console.log(`Answer: ${selectedOption}`); hideError();
    if (!currentQuestionData || !optionsContainerElement) { return; }
    const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true);
    const isCorrect = selectedOption === currentQuestionData.correctAnswer;
    if (isCorrect) {
        currentScore++; if(currentScoreElement) currentScoreElement.textContent = currentScore;
        buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); });
        setTimeout(loadNextQuestion, 700);
    } else {
        buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer'); if (button.textContent === selectedOption) button.classList.add('incorrect-answer'); });
        setTimeout(endGame, 1500);
    }
}

 // ----- 8. Функції таймера (ДОДАНО ЛОГ) -----
function startTimer() {
    stopTimer(); timeLeft = 10;
    if(!timeLeftElement) { console.error("startTimer: timeLeftElement missing!"); return; }
    timeLeftElement.textContent = timeLeft;
    console.log("Starting timer interval..."); // ЛОГ СТАРТУ
    timerInterval = setInterval(() => {
        timeLeft--;
        console.log(`Timer Tick: timeLeft=${timeLeft}`); // <-- ДОДАНО ЛОГ ТІКУ
        if(timeLeftElement) {
            try { timeLeftElement.textContent = timeLeft.toString(); }
            catch(e) { console.error("Timer update error:", e); stopTimer(); }
        } else { console.error("Timer tick: timeLeftElement missing!"); stopTimer(); return; }
        if (timeLeft <= 0) {
            console.log("Time up!"); stopTimer();
            if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.style.outline = '2px solid orange'; } }); }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }

// ----- 9. Функції керування грою -----
function showDifficultySelection() { console.log("Showing difficulty selection"); hideError(); if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Difficulty selected: ${selectedDifficulty}`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame(); }
async function startGame() { console.log(`Starting game! Difficulty: ${selectedDifficulty}`); hideError(); if (selectedDifficulty === null) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement || !userStatusElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(userStatusElement) userStatusElement.style.display = 'none'; await loadNextQuestion(); }
async function loadNextQuestion() { console.log("loadNextQuestion: Calling loadNewQuestion..."); const questionData = await loadNewQuestion(); if (questionData) { console.log("loadNextQuestion: Data received, calling displayQuestion..."); displayQuestion(questionData); } else { console.log("loadNextQuestion: Failed to load question data."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; } }
async function loadNewQuestion() { if (!supabaseClient || selectedDifficulty === null) { return null; } console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); showLoading(); try { const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty); if (countError || stickerCount === null) throw (countError || new Error('Failed count')); if (stickerCount === 0) { throw new Error(`No stickers for difficulty ${selectedDifficulty}!`); } const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true }); if (totalClubCountError || totalClubCount === null) throw (totalClubCountError || new Error('Failed count')); if (totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount})!`); } const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single(); if (stickerError) { throw new Error(`Sticker fetch error: ${stickerError.message}`); } if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Sticker/club data missing."); } const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options."); const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3); if (incorrectOptions.length < 3) throw new Error("Failed to get 3 options."); const questionDataForDisplay = { imageUrl: randomStickerData.image_url, options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()), correctAnswer: correctClubName }; hideLoading(); return questionDataForDisplay; } catch (error) { console.error("Error loading question:", error); showError(`Loading Error: ${error.message}`); hideLoading(); setTimeout(endGame, 500); return null; } }
function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'block'; saveScore(); }
async function saveScore() { if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; } if (currentScore === 0) { const scoreInfoMsg = document.createElement('p'); scoreInfoMsg.textContent = 'Scores > 0 are saved.'; scoreInfoMsg.className = 'save-message'; scoreInfoMsg.style.cssText = 'font-size: small; margin-top: 5px;'; const scoreParagraph = finalScoreElement?.parentNode; if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); } } return; } console.log(`Attempting save: Score=${currentScore}, Diff=${selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null; console.log("DEBUG: Fetching GeoIP..."); try { await fetch('https://ip-api.com/json/?fields=status,message,countryCode').then(response => { console.log("DEBUG: GeoIP Status:", response.status); if (!response.ok) { return response.text().then(text => { throw new Error(`GeoIP Error: ${response.statusText} ${text}`); }); } return response.json(); }).then(data => { console.log("DEBUG: GeoIP Data:", data); if (data.status === 'success' && data.countryCode) { detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase(); console.log(`DEBUG: Country: ${detectedCountryCode}`); } else { console.warn("DEBUG: Could not get country:", data); } }).catch(fetchError => { console.error("DEBUG: fetch/json error:", fetchError); }); } catch (outerError) { console.error("DEBUG: Outer fetch error:", outerError); } console.log("DEBUG: GeoIP finished. Country =", detectedCountryCode); try { console.log(`Saving to DB: country=${detectedCountryCode}`); const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px;'; if(resultAreaElement) { const p = resultAreaElement.querySelector('p'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { return null; } console.log(`Workspaceing leaderboard: ${timeframe}, diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = ''; if (!data || data.length === 0) { leaderboardListElement.innerHTML = '<li>No results found.</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; li.textContent = `${username} - ${entry.score}`; leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !gameAreaElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'none'; if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
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
    // Ініціалізуємо елементи і перевіряємо результат
    if (!initializeDOMElements()) {
        console.error("CRITICAL: Failed to initialize DOM elements on startup.");
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
    if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; // Кнопка лідерборду видима
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; // Сам лідерборд - ні
}
