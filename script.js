// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Initialize Supabase Client -----
if (typeof supabase === 'undefined') { /* ... */ } else { /* ... */ } // No changes

// ----- 3. Global Game State Variables -----
// No changes
let currentQuestionData = null; /* ... */

// ----- 4. DOM Element References -----
// No changes
let gameAreaElement, /* ... */ leaderboardDifficultyFilterButtons;

// Nickname Generation Words & Function
const NICKNAME_ADJECTIVES = ["Fast", "Quick", /* ... */];
const NICKNAME_NOUNS = ["Fox", "Wolf", /* ... */];
function generateRandomNickname() { /* ... */ }

// Initialize DOM Elements (Includes nickname elements)
function initializeDOMElements() { /* ... */ } // No changes


// ----- 5. Authentication Functions -----
async function loginWithGoogle() { /* ... */ } // No changes
async function logout() { /* ... */ } // No changes
function updateAuthStateUI(user) { /* ... */ } // No changes
async function checkAndCreateUserProfile(user) { /* ... */ } // No changes
function setupAuthStateChangeListener() { /* ... */ } // No changes
async function checkInitialAuthState() { /* ... */ } // No changes

// ----- 5.5 Nickname Editing Functions -----
function showNicknameEditForm() { /* ... */ } // No changes
function hideNicknameEditForm() { /* ... */ } // No changes
async function handleNicknameSave(event) { /* ... */ } // No changes
async function updateNickname(newNickname) { /* ... */ } // No changes (added this function previously)


// ----- 6. Display Question Function -----
function displayQuestion(questionData) { /* ... */ } // No changes
// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) { /* ... */ } // No changes
 // ----- 8. Timer Functions -----
function startTimer() { /* ... */ } // No changes
function stopTimer() { /* ... */ } // No changes
// ----- 9. Game Flow Functions -----
function showDifficultySelection() { /* ... */ } // No changes
function handleDifficultySelection(event) { /* ... */ } // No changes
async function startGame() { /* ... */ } // No changes
async function loadNextQuestion() { /* ... */ } // No changes
async function loadNewQuestion() { /* ... */ } // No changes
function endGame() { /* ... */ } // No changes

 // --- Функція збереження результату (ОНОВЛЕНО - Використовує ipinfo.io) ---
 async function saveScore() {
     if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; }
     if (currentScore === 0) { /* ... Повідомлення про нульовий рахунок ... */ return; }

     console.log(`Attempting save: Score=<span class="math-inline">\{currentScore\}, Diff\=</span>{selectedDifficulty}, User=${currentUser.id}`);
     showLoading();
     let detectedCountryCode = null;
     const ipInfoToken = "8ec00bc9c7f20a"; // <-- !!! ВСТАВ СВІЙ ТОКЕН СЮДИ !!!

     // --- Початок блоку GeoIP (з ipinfo.io) ---
     console.log("DEBUG: Fetching GeoIP from ipinfo.io...");
     try {
         // Перевірка, чи є токен
         if (!ipInfoToken || ipInfoToken === "YOUR_IPINFO_TOKEN") {
              console.warn("DEBUG: IPinfo token is missing or placeholder! Skipping GeoIP.");
              throw new Error("IPinfo token not configured."); // Можна не кидати помилку, а просто пропустити
         }

         // Формуємо URL з токеном
         const geoApiUrl = `https://ipinfo.io/json?token=${ipInfoToken}`;

         await fetch(geoApiUrl)
             .then(response => {
                 console.log("DEBUG: ipinfo.io response status:", response.status, response.statusText);
                 if (!response.ok) {
                     // Спробуємо отримати текст помилки від ipinfo
                     return response.text().then(text => {
                         console.error("DEBUG: ipinfo.io fetch NOT ok:", response.statusText, "Body:", text);
                         // Можливі причини: невірний токен, перевищення ліміту, блокування IP
                         throw new Error(`GeoIP Error: ${response.statusText}`);
                     });
                 }
                 console.log("DEBUG: Getting JSON from ipinfo.io...");
                 return response.json();
             })
             .then(data => {
                 console.log("DEBUG: ipinfo.io JSON data:", data);
                 // У ipinfo код країни зазвичай в полі 'country'
                 if (data && data.country) {
                     detectedCountryCode = String(data.country).substring(0, 2).toUpperCase();
                     console.log(`DEBUG: Country detected as ${detectedCountryCode}`);
                 } else {
                     console.warn("DEBUG: Could not determine country from ipinfo.io data:", data);
                 }
             })
             .catch(fetchError => {
                 // Ловимо помилки fetch, json() або викинуті з !response.ok
                 console.error("DEBUG: Error in fetch/json promise for ipinfo.io:", fetchError);
             });
     } catch (outerError) {
         console.error("DEBUG: Unexpected outer error during ipinfo.io fetch:", outerError);
     }
     console.log("DEBUG: GeoIP finished. detectedCountryCode =", detectedCountryCode);
     // --- Кінець блоку GeoIP ---


     // --- Початок блоку збереження в БД ---
     try {
         console.log(`Saving to DB: country=${detectedCountryCode}`);
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore,
                 difficulty: selectedDifficulty,
                 country_code: detectedCountryCode // Передаємо отриманий код (або null)
             });
         if (error) { /* ... Обробка помилок insert ... */ throw error; }
         console.log("Score saved successfully!");
         /* ... Повідомлення про збереження ... */
     } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); }
     finally { hideLoading(); }
 }


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
// Тут має бути повний код всіх функцій, які були скорочені як /* ... */
async function loginWithGoogle() { if (!supabaseClient) return showError("Client error."); hideError(); try { const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } }); if (error) throw error; } catch (error) { console.error("Login error:", error); showError(`Login failed: ${error.message}`); } }
async function logout() { if (!supabaseClient) { return showError("Client error."); } console.log("Attempting sign out..."); hideError(); try { const { error } = await supabaseClient.auth.signOut(); if (error) { throw error; } console.log("SignOut successful."); } catch (error) { console.error("Logout error:", error); showError(`Logout failed: ${error.message}`); } }
function updateAuthStateUI(user) { console.log("Running updateAuthStateUI. User:", user ? user.id : 'null'); if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardButton || !editNicknameButton) { console.warn("updateAuthStateUI: DOM elements not ready!"); return; } hideNicknameEditForm(); if (user) { currentUser = user; userNicknameElement.textContent = currentUserProfile?.username || user.email || 'Loading...'; userStatusElement.style.display = 'block'; loginButton.style.display = 'none'; showLeaderboardButton.style.display = 'inline-block'; editNicknameButton.style.display = 'inline-block'; if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') { showDifficultySelection(); } else { if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; } } else { currentUser = null; currentUserProfile = null; if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton null!"); } if (userStatusElement) userStatusElement.style.display = 'none'; if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; if (editNicknameButton) editNicknameButton.style.display = 'none'; stopTimer(); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; } }
function generateRandomNickname() { const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)]; const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)]; return `${adj} ${noun}`; }
async function checkAndCreateUserProfile(user) { if (!supabaseClient || !user) return; console.log(`checkAndCreateUserProfile for ${user.id}...`); currentUserProfile = null; let finalUsernameToShow = user.email || 'User'; try { let { data: profileData, error: selectError } = await supabaseClient.from('profiles').select('id, username').eq('id', user.id).maybeSingle(); if (selectError && selectError.code !== 'PGRST116') throw selectError; if (!profileData) { console.log(`Profile not found. Creating...`); const randomNickname = generateRandomNickname(); const { data: insertedProfile, error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: randomNickname, updated_at: new Date() }).select('id, username').single(); if (insertError) throw insertError; currentUserProfile = insertedProfile; finalUsernameToShow = insertedProfile?.username || finalUsernameToShow; console.log(`Profile created: ${finalUsernameToShow}`); } else { currentUserProfile = profileData; finalUsernameToShow = profileData.username || finalUsernameToShow; console.log(`Profile exists: ${finalUsernameToShow}`); } if (userNicknameElement) { userNicknameElement.textContent = finalUsernameToShow; } } catch (error) { console.error("checkAndCreateUserProfile Error:", error); showError(`Profile Error: ${error.message}`); if (userNicknameElement) userNicknameElement.textContent = finalUsernameToShow; currentUserProfile = null; } }
function setupAuthStateChangeListener() { if (!supabaseClient) { return; } console.log("Setting up listener..."); supabaseClient.auth.onAuthStateChange(async (_event, session) => { console.log(`Auth Event: ${_event}`); const user = session?.user ?? null; if (initializeDOMElements()) { updateAuthStateUI(user); if (_event === 'SIGNED_IN' && user) { await checkAndCreateUserProfile(user); } } else { currentUser = user; } if (_event === 'SIGNED_OUT') { console.log("SIGNED_OUT Reset."); stopTimer(); selectedDifficulty = 1; currentLeaderboardDifficulty = 1; currentLeaderboardTimeframe = 'all'; currentUserProfile = null; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; } }); console.log("Listener setup."); }
async function checkInitialAuthState() { if (!supabaseClient) { return; }; console.log("Checking initial auth..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; currentUser = session?.user ?? null; console.log("Initial auth checked.", currentUser ? `User: ${currentUser.id}` : "No user"); if (currentUser) { await checkAndCreateUserProfile(currentUser); } } catch (error) { console.error("Error initial session:", error); currentUser = null; currentUserProfile = null; } }
function showNicknameEditForm() { if (!currentUserProfile || !userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) { return; } console.log("Showing edit form."); hideError(); nicknameInputElement.value = currentUserProfile.username || ''; userNicknameElement.style.display = 'none'; editNicknameButton.style.display = 'none'; editNicknameForm.style.display = 'inline-block'; nicknameInputElement.focus(); nicknameInputElement.select(); }
function hideNicknameEditForm() { if (!userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) { return; } editNicknameForm.style.display = 'none'; nicknameInputElement.value = ''; if (currentUser) { userNicknameElement.style.display = 'inline'; editNicknameButton.style.display = 'inline-block'; } }
async function handleNicknameSave(event) { event.preventDefault(); if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) { showError("Cannot save now."); return; } const newNickname = nicknameInputElement.value.trim(); if (!newNickname || newNickname.length < 3 || newNickname.length > 25) { showError("Nickname must be 3-25 characters."); return; } if (newNickname === currentUserProfile.username) { hideNicknameEditForm(); return; } showLoading(); hideError(); try { const { data: updatedData, error } = await supabaseClient.from('profiles').update({ username: newNickname, updated_at: new Date() }).eq('id', currentUser.id).select('username').single(); if (error) throw error; console.log("Nickname updated:", updatedData); currentUserProfile.username = updatedData.username; if (userNicknameElement) { userNicknameElement.textContent = updatedData.username; } hideNicknameEditForm(); showError("Nickname updated!"); setTimeout(hideError, 2000); if (leaderboardSectionElement?.style.display === 'block') { updateLeaderboard(); } } catch (error) { console.error("Error updating nickname:", error); showError(`Failed to update nickname: ${error.message}`); } finally { hideLoading(); } }
function displayQuestion(questionData) { if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { return; } currentQuestionData = questionData; hideError(); stickerImageElement.src = ""; stickerImageElement.alt = "Loading..."; stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Error loading image: ${questionData.imageUrl}`); showError("Failed to load image."); stickerImageElement.alt = "Error"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; }; optionsContainerElement.innerHTML = ''; if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText) => { const button = document.createElement('button'); button.textContent = optionText; button.disabled = false; button.classList.remove('correct-answer', 'incorrect-answer'); button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); } else { console.error("Invalid options!"); showError("Error displaying options."); setTimeout(endGame, 500); return; } timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer(); }
function handleAnswer(selectedOption) { stopTimer(); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); const isCorrect = selectedOption === currentQuestionData.correctAnswer; if (isCorrect) { currentScore++; if(currentScoreElement) currentScoreElement.textContent = currentScore; buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); }); setTimeout(loadNextQuestion, 700); } else { buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer'); if (button.textContent === selectedOption) button.classList.add('incorrect-answer'); }); setTimeout(endGame, 1500); } }
function startTimer() { stopTimer(); timeLeft = 10; if(!timeLeftElement) { return; } timeLeftElement.textContent = timeLeft; timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { stopTimer(); } } else { stopTimer(); return; } if (timeLeft <= 0) { stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.style.outline = '2px solid orange'; } }); } setTimeout(endGame, 1500); } }, 1000); }
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }
function showDifficultySelection() { hideError(); if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame(); }
async function startGame() { hideError(); if (selectedDifficulty === null) { showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement || !userStatusElement) { if (!initializeDOMElements()) { handleCriticalError("Failed init."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(userStatusElement) userStatusElement.style.display = 'none'; await loadNextQuestion(); }
async function loadNextQuestion() { console.log("loadNextQuestion: Calling loadNewQuestion..."); const questionData = await loadNewQuestion(); if (questionData) { console.log("loadNextQuestion: Data received, calling displayQuestion..."); displayQuestion(questionData); } else { console.log("loadNextQuestion: Failed to load question data."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; } }
async function loadNewQuestion() { if (!supabaseClient || selectedDifficulty === null) { return null; } console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); showLoading(); try { const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty); if (countError || stickerCount === null) throw (countError || new Error('Failed count')); if (stickerCount === 0) { throw new Error(`No stickers for difficulty ${selectedDifficulty}!`); } const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true }); if (totalClubCountError || totalClubCount === null) throw (totalClubCountError || new Error('Failed count')); if (totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount})!`); } const randomIndex = Math.floor(Math.random() * stickerCount); const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single(); if (stickerError) { throw new Error(`Sticker fetch error: ${stickerError.message}`); } if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Sticker/club data missing."); } const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options."); const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3); if (incorrectOptions.length < 3) throw new Error("Failed to get 3 options."); const questionDataForDisplay = { imageUrl: randomStickerData.image_url, options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()), correctAnswer: correctClubName }; hideLoading(); return questionDataForDisplay; } catch (error) { console.error("Error loading question:", error); showError(`Loading Error: ${error.message}`); hideLoading(); setTimeout(endGame, 500); return null; } }
function endGame() { console.log(`Game Over! Score: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const msg = resultAreaElement.querySelector('.save-message'); if(msg) msg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'block'; saveScore(); }
// saveScore - version with ipinfo.io token needed
async function saveScore() { if (!currentUser || typeof currentScore !== 'number' || currentScore < 0 || selectedDifficulty === null) { return; } if (currentScore === 0) { /* ... message ... */ return; } console.log(`Attempting save: Score=<span class="math-inline">\{currentScore\}, Diff\=</span>{selectedDifficulty}, User=${currentUser.id}`); showLoading(); let detectedCountryCode = null; const ipInfoToken = "YOUR_IPINFO_TOKEN"; /* <--- PASTE YOUR TOKEN HERE --- */ console.log("DEBUG: Fetching GeoIP from ipinfo.io..."); try { if (!ipInfoToken || ipInfoToken === "YOUR_IPINFO_TOKEN") { console.warn("DEBUG: IPinfo token missing!"); throw new Error("IPinfo token not configured."); } const geoApiUrl = `https://ipinfo.io/json?token=${ipInfoToken}`; await fetch(geoApiUrl).then(response => { console.log("DEBUG: ipinfo.io response status:", response.status, response.statusText); if (!response.ok) { return response.text().then(text => { console.error("DEBUG: ipinfo.io fetch NOT ok:", response.statusText, "Body:", text); throw new Error(`GeoIP Error: ${response.statusText}`); }); } console.log("DEBUG: Getting JSON from ipinfo.io..."); return response.json(); }).then(data => { console.log("DEBUG: ipinfo.io JSON data:", data); if (data && data.country) { detectedCountryCode = String(data.country).substring(0, 2).toUpperCase(); console.log(`DEBUG: Country detected as ${detectedCountryCode}`); } else { console.warn("DEBUG: Could not determine country from ipinfo.io data:", data); } }).catch(fetchError => { console.error("DEBUG: Error in fetch/json promise for ipinfo.io:", fetchError); }); } catch (outerError) { console.error("DEBUG: Unexpected outer error during ipinfo.io fetch:", outerError); } console.log("DEBUG: GeoIP finished. detectedCountryCode =", detectedCountryCode); try { console.log(`Saving to DB: country=${detectedCountryCode}`); const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { /* ... handle insert error ... */ throw error; } console.log("Score saved successfully!"); const scoreSavedMessage = document.createElement('p'); scoreSavedMessage.textContent = 'Your score has been saved!'; scoreSavedMessage.className = 'save-message'; scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px;'; if(resultAreaElement) { const p = resultAreaElement.querySelector('p'); if(p) p.insertAdjacentElement('afterend', scoreSavedMessage); else resultAreaElement.appendChild(scoreSavedMessage); } } catch (error) { console.error("Error saving score:", error); showError(`Failed to save score: ${error.message}`); } finally { hideLoading(); } }
function calculateTimeRange(timeframe) { const now = new Date(); let fromDate = null; let toDate = null; switch (timeframe) { case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break; case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break; case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break; case 'all': default: fromDate = null; toDate = null; break; } return { fromDate, toDate }; }
async function fetchLeaderboardData(timeframe, difficulty) { if (!supabaseClient) { return null; } console.log(`Workspaceing leaderboard: ${timeframe}, diff ${difficulty}`); showLoading(); hideError(); try { const { fromDate, toDate } = calculateTimeRange(timeframe); let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty); if (fromDate) { query = query.gte('created_at', fromDate); } if (toDate) { query = query.lt('created_at', toDate); } query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10); const { data, error } = await query; if (error) { throw error; } return data; } catch (error) { console.error("Leaderboard fetch error:", error); showError(`Could not load leaderboard: ${error.message}`); return null; } finally { hideLoading(); } }
function displayLeaderboard(data) { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = ''; if (!data || data.length === 0) { leaderboardListElement.innerHTML = '<li>No results found.</li>'; return; } data.forEach((entry) => { const li = document.createElement('li'); const username = entry.profiles?.username || 'Anonymous'; li.textContent = `${username} - ${entry.score}`; leaderboardListElement.appendChild(li); }); }
function updateFilterButtonsUI() { leaderboardTimeFilterButtons?.forEach(btn => { const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); leaderboardDifficultyFilterButtons?.forEach(btn => { const btnDifficulty = parseInt(btn.dataset.difficulty, 10); const isActive = btnDifficulty === currentLeaderboardDifficulty; btn.classList.toggle('active', isActive); btn.disabled = isActive; }); }
async function updateLeaderboard() { if (!leaderboardListElement) { return; } leaderboardListElement.innerHTML = '<li>Loading...</li>'; updateFilterButtonsUI(); const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty); displayLeaderboard(data); }
function handleTimeFilterChange(event) { const button = event.currentTarget; const newTimeframe = button.dataset.timeframe; if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) { currentLeaderboardTimeframe = newTimeframe; updateLeaderboard(); } }
function handleDifficultyFilterChange(event) { const button = event.currentTarget; const newDifficulty = parseInt(button.dataset.difficulty, 10); if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) { currentLeaderboardDifficulty = newDifficulty; updateLeaderboard(); } }
// Виправлено openLeaderboard
function openLeaderboard() { console.log("Opening leaderboard..."); hideError(); if (!leaderboardSectionElement || !gameAreaElement) { if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; } } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; /* НЕ ХОВАЄМО userStatusElement */ if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block'; updateLeaderboard(); }
function closeLeaderboard() { console.log("Closing leaderboard..."); if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; updateAuthStateUI(currentUser); }
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); document.body.innerHTML = `<h1>Error</h1><p>${message}</p><p>Please refresh the page.</p>`; }
function showLoading() { console.log("Loading..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("...Loading finished"); if (loadingIndicator) loadingIndicator.style.display = 'none'; }
function initializeApp() { console.log("DOM loaded, initializing app..."); if (!initializeDOMElements()) { console.error("CRITICAL: Failed DOM init."); return; } setupAuthStateChangeListener(); updateAuthStateUI(currentUser); console.log("App initialized. Waiting for user actions."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; }
