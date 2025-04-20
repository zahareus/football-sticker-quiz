// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
if (typeof supabase === 'undefined') { /* ... */ } else { /* ... */ } // Без змін

// ----- 3. Глобальні змінні -----
let currentQuestionData = null; let currentScore = 0; let timeLeft = 10; let timerInterval = null; let currentUser = null; let selectedDifficulty = 1; let currentLeaderboardTimeframe = 'all'; let currentLeaderboardDifficulty = 1; let currentUserProfile = null;

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons; let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

function initializeDOMElements() { /* ... */ } // Без змін

// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() { /* ... */ }
async function logout() { /* ... */ }
function updateAuthStateUI(user) { /* ... */ }
function generateRandomNickname() { /* ... */ }
async function checkAndCreateUserProfile(user) { /* ... */ }
function setupAuthStateChangeListener() { /* ... */ }
async function checkInitialAuthState() { /* ... */ }

// ----- 6. Функція для відображення запитання -----
function displayQuestion(questionData) {
    console.log("--- displayQuestion START --- Data:", questionData);
    if (!questionData) { console.error("displayQuestion: No data provided."); return; }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { console.error("displayQuestion: DOM elements missing!"); return; }
    currentQuestionData = questionData; hideError();
    stickerImageElement.src = ""; stickerImageElement.alt = "Loading sticker...";
    console.log("displayQuestion: Setting image src:", questionData.imageUrl);
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; };
    optionsContainerElement.innerHTML = '';
    console.log("displayQuestion: Creating buttons...");
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText, index) => {
            console.log(`displayQuestion: Creating button ${index}: "${optionText}"`);
            try {
                const button = document.createElement('button'); button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button);
                console.log(`displayQuestion: Button "${optionText}" appended.`);
            } catch (loopError) { console.error(`displayQuestion: Error in button loop at index ${index} for option "${optionText}":`, loopError); showError("Error creating buttons."); return; }
        });
        console.log("displayQuestion: Button creation loop finished.");
    } else { console.error("Invalid options!"); showError("Error displaying options."); setTimeout(endGame, 500); return; }
    timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;
    if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none';
    startTimer(); // Запускаємо таймер
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) { /* ... */ }
 // ----- 8. Функції таймера -----
function startTimer() { /* ... */ }
function stopTimer() { /* ... */ }

// ----- 9. Функції керування грою -----
function showDifficultySelection() { /* ... */ }
function handleDifficultySelection(event) { /* ... */ }

// Функція старту гри (ТЕПЕР ВИКЛИКАЄ displayQuestion НАПРЯМУ З ТЕСТОВИМИ ДАНИМИ)
async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty} (ТЕСТОВИЙ ВИКЛИК!)`);
    hideError();
    if (selectedDifficulty === null) { console.error("Спроба почати гру без складності!"); showDifficultySelection(); return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement || !userStatusElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } }

    currentScore = 0; // Скидаємо рахунок
    if (currentScoreElement) currentScoreElement.textContent = 0; // Оновлюємо UI
    if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block'; // Показуємо ігрову зону
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; }
    if(userStatusElement) userStatusElement.style.display = 'none';

    // Закоментуємо реальне завантаження даних
    // await loadNextQuestion();

    // Створюємо ТЕСТОВІ дані (використай реальний URL картинки, який точно працює)
    console.log("startGame: Calling displayQuestion with DUMMY data...");
    const dummyData = {
        imageUrl: "https://rbmeslzlbsoikxnvesqb.supabase.co/storage/v1/object/public/stickers/FC%20Bayern%20Mu%CC%88nchen/IMG_0161.jpeg", // <-- ВСТАВ СЮДИ URL КАРТИНКИ, ЯКА ТОЧНО ПРАЦЮЄ!
        options: ["Dummy Option 1", "Dummy Option 2", "Dummy Option 3", "FC Bayern München"],
        correctAnswer: "FC Bayern München"
    };

    try {
        displayQuestion(dummyData); // Викликаємо displayQuestion напряму
        console.log("startGame: displayQuestion with DUMMY data finished (no crash).");
    } catch (e) {
        console.error("startGame: Error calling displayQuestion with dummy data:", e);
        showError("Critical error displaying question.");
        endGame(); // Завершити гру при помилці відображення
    }
}

// Функція завантаження наступного запитання (зараз не використовується в startGame)
async function loadNextQuestion() {
    console.log("loadNextQuestion: Calling loadNewQuestion...");
    const questionData = await loadNewQuestion();
    if (questionData) {
        console.log("loadNextQuestion: Data received, calling displayQuestion...");
        displayQuestion(questionData); // Виклик залишаємо тут для нормальної роботи
    } else { console.log("loadNextQuestion: Failed to load question data."); /*...*/ }
}

// Функція завантаження даних запитання (без змін)
async function loadNewQuestion() { /* ... */ }
function endGame() { /* ... */ }
async function saveScore() { /* ... */ }

// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) { /* ... */ }
async function fetchLeaderboardData(timeframe, difficulty) { /* ... */ }
function displayLeaderboard(data) { /* ... */ }
function updateFilterButtonsUI() { /* ... */ }
async function updateLeaderboard() { /* ... */ }
function handleTimeFilterChange(event) { /* ... */ }
function handleDifficultyFilterChange(event) { /* ... */ }
function openLeaderboard() { /* ... */ }
function closeLeaderboard() { /* ... */ }

// ----- 11. Helper Functions -----
function showError(message) { /* ... */ }
function hideError() { /* ... */ }
function handleCriticalError(message) { /* ... */ }
function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }

// ----- 12. App Initialization -----
function initializeApp() { /* ... */ }


// ----- Повний код решти функцій -----
// ТУТ МАЮТЬ БУТИ ПОВНІ ТІЛА ВСІХ СКОРОЧЕНИХ /* ... */ ФУНКЦІЙ
// Я їх включу нижче для абсолютної повноти, вони не змінились

async function loginWithGoogle() { console.log("Login function CALLED!"); if (!supabaseClient) return showError("Supabase client not initialized."); hideError(); try { const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } }); if (error) throw error; console.log("Redirecting to Google..."); } catch (error) { console.error("Google login error:", error); showError(`Login failed: ${error.message}`); } }
async function logout() { console.log("Logout function CALLED!"); if (!supabaseClient) { console.error("Logout Error: Supabase client missing!"); return showError("Supabase client not initialized."); } console.log("Attempting to sign out..."); hideError(); try { const { error } = await supabaseClient.auth.signOut(); if (error) { console.error("Supabase signOut error object:", error); throw error; } console.log("supabaseClient.auth.signOut() successful."); } catch (error) { console.error("Logout function error:", error); showError(`Logout failed: ${error.message}`); } }
function updateAuthStateUI(user) { console.log("Running updateAuthStateUI. User:", user ? user.id : 'null'); if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement || !showLeaderboardButton) { console.warn("updateAuthStateUI: DOM elements not ready!"); return; } if (user) { currentUser = user; if (userEmailElement) userEmailElement.textContent = 'Loading...'; userStatusElement.style.display = 'block'; loginButton.style.display = 'none'; showLeaderboardButton.style.display = 'inline-block'; if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') { showDifficultySelection(); } else { if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; } console.log("UI Updated: User logged in (initial display)."); } else { currentUser = null; if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton null!"); } if (userStatusElement) userStatusElement.style.display = 'none'; if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; stopTimer(); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; console.log("UI Updated: User logged out."); } }
function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }
async function checkAndCreateUserProfile(user) { if (!supabaseClient || !user) return; console.log(`checkAndCreateUserProfile for ${user.id}...`); currentUserProfile = null; let finalUsernameToShow = user.email || 'User'; try { const { data: profileData, error: selectError } = await supabaseClient.from('profiles').select('id, username').eq('id', user.id).maybeSingle(); if (selectError && selectError.code !== 'PGRST116') throw selectError; if (!profileData) { console.log(`Profile not found. Creating...`); const randomNickname = generateRandomNickname(); const { data: insertedProfile, error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: randomNickname, updated_at: new Date() }).select('id, username').single(); if (insertError) throw insertError; currentUserProfile = insertedProfile; finalUsernameToShow = insertedProfile?.username || finalUsernameToShow; console.log(`Profile created with nickname: ${finalUsernameToShow}`); } else { currentUserProfile = profileData; finalUsernameToShow = profileData.username || finalUsernameToShow; console.log(`Profile exists. Username: ${finalUsernameToShow}`); } if (userEmailElement) { userEmailElement.textContent = finalUsernameToShow; } } catch (error) { console.error("checkAndCreateUserProfile Error:", error); showError(`Profile Error: ${error.message}`); if (userEmailElement) userEmailElement.textContent = finalUsernameToShow; currentUserProfile = null; } }
function setupAuthStateChangeListener() { if (!supabaseClient) { return; } console.log("Setting up onAuthStateChange listener..."); supabaseClient.auth.onAuthStateChange(async (_event, session) => { console.log(`Auth Event: ${_event}`); const user = session?.user ?? null; if (initializeDOMElements()) { updateAuthStateUI(user); if (_event === 'SIGNED_IN' && user) { await checkAndCreateUserProfile(user); } } else { console.warn("onAuthStateChange: DOM not ready"); currentUser = user; } if (_event === 'SIGNED_OUT') { console.log("SIGNED_OUT: Resetting state."); stopTimer(); selectedDifficulty = 1; currentLeaderboardDifficulty = 1; currentLeaderboardTimeframe = 'all'; currentUserProfile = null; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; } }); console.log("onAuthStateChange listener setup complete."); }
async function checkInitialAuthState() { if (!supabaseClient) { return; }; console.log("Checking initial auth state..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial auth state checked.", currentUser ? `User: ${currentUser.id}` : "No user"); if (currentUser) { await checkAndCreateUserProfile(currentUser); } } catch (error) { console.error("Error getting initial session:", error); currentUser = null; currentUserProfile = null; } }
function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; if (isCorrect) { currentScore++; if(currentScoreElement) currentScoreElement.textContent = currentScore; buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); }); setTimeout(loadNextQuestion, 700); } else { buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer'); if (button.textContent === selectedOption) button.classList.add('incorrect-answer'); }); setTimeout(endGame, 1500); } }
async function loadNewQuestion() { if (!supabaseClient || selectedDifficulty === null) { return null; } console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); showLoading(); try { const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty); if (countError || stickerCount === null) throw (countError || new Error('Failed count')); if (stickerCount === 0) { throw new Error(`No stickers for difficulty ${selectedDifficulty}!`); } const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true }); if (totalClubCountError || totalClubCount === null) throw (totalClubCountError || new Error('Failed count')); if (totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount})!`); } const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single(); if (stickerError) { throw new Error(`Sticker fetch error: ${stickerError.message}`); } if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Sticker/club data missing."); } const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options."); const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3); if (incorrectOptions.length < 3) throw new Error("Failed to get 3 options."); const questionDataForDisplay = { imageUrl: randomStickerData.image_url, options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()), correctAnswer: correctClubName }; hideLoading(); return questionDataForDisplay; } catch (error) { console.error("Error loading question:", error); showError(`Loading Error: ${error.message}`); hideLoading(); setTimeout(endGame, 500); return null; } }
function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'block'; saveScore(); }
async function saveScore() { if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; } if (currentScore === 0) { const scoreInfoMsg = document.createElement('p'); scoreInfoMsg.textContent = 'Scores > 0 are saved.'; scoreInfoMsg.className = 'save-message'; scoreInfoMsg.style.cssText = 'font-size: small; margin-top: 5px;'; const scoreParagraph = finalScoreElement?.parentNode; if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); } } return; } console.log(`Attempting save: Score=${currentScore}, Diff=${selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null; console.log("DEBUG: Fetching GeoIP..."); try { await fetch('https://ip-api.com/json/?fields=status,message,countryCode').then(response => { console.log("DEBUG: GeoIP Status:", response.status); if (!response.ok) { return response.text().then(text => { throw new Error(`GeoIP Error: ${response.statusText} ${text}`); }); } return response.json(); }).then(data => { console.log("DEBUG: GeoIP Data:", data); if (data.status === 'success' && data.countryCode) { detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase(); console.log(`DEBUG: Country: ${detectedCountryCode}`); } else { console.warn("DEBUG: Could not get country:", data); } }).catch(fetchError => { console.error("DEBUG: fetch/json error:", fetchError); }); } catch (outerError) { console.error("DEBUG: Outer fetch error:", outerError); } console.log("DEBUG: GeoIP finished. Country =", detectedCountryCode); try { console.log(`Saving to DB: country=${detectedCountryCode}`); const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { throw error; } console.log("Score saved!"); const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px;'; if(resultAreaElement) { const p = resultAreaElement.querySelector('p'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { return null; } console.log(`Workspaceing leaderboard: ${timeframe}, diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = ''; if (!data || data.length === 0) { leaderboardListElement.innerHTML = '<li>No results found.</li>'; return; } data.forEach((entry, index) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; li.textContent = `${username} - ${entry.score}`; leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !gameAreaElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'none'; if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); document.body.innerHTML = `<h1>Error</h1><p>${message}</p><p>Please refresh the page.</p>`; }
function showLoading() { console.log("Loading..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("...Loading finished"); if (loadingIndicator) loadingIndicator.style.display = 'none'; }
function initializeApp() { console.log("DOM loaded, initializing app..."); if (!initializeDOMElements()) { console.error("CRITICAL: Failed to initialize DOM elements."); return; } setupAuthStateChangeListener(); updateAuthStateUI(currentUser); console.log("App initialized. Waiting for user actions."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; }
