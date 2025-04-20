// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
if (typeof supabase === 'undefined') {
  console.error('Помилка: Бібліотека Supabase не завантажилась.');
  handleCriticalError('Помилка завантаження гри. Спробуйте оновити сторінку.');
} else {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Клієнт Supabase успішно ініціалізовано');
    checkInitialAuthState(); // Перевіряємо стан до завантаження DOM
    // Ініціалізуємо додаток тільки після повного завантаження DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp(); // DOM вже готовий
    }
  } catch (error) {
    console.error('Помилка ініціалізації Supabase:', error);
    handleCriticalError('Помилка підключення до гри. Спробуйте оновити сторінку.');
    supabaseClient = null;
  }
}

// ----- 3. Глобальні змінні -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;
let currentUser = null; // Встановлюється checkInitialAuthState та onAuthStateChange
let selectedDifficulty = 1; // Починаємо з легкої за замовчуванням для лідерборду
// Змінні стану лідерборду
let currentLeaderboardTimeframe = 'all'; // 'today', 'week', 'month', 'all'
let currentLeaderboardDifficulty = 1;   // 1, 2, 3

// ----- 4. DOM Елементи -----
// Оголошуємо тут, знаходимо в initializeDOMElements
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons; // Елементи лідерборду

// Функція знаходить елементи і додає слухачів
function initializeDOMElements() {
    console.log("initializeDOMElements: Пошук елементів...");
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
    // Елементи лідерборду
    leaderboardSectionElement = document.getElementById('leaderboard-section');
    leaderboardListElement = document.getElementById('leaderboard-list');
    closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    showLeaderboardButton = document.getElementById('show-leaderboard-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');

    // Перевірка ВСІХ елементів
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка initializeDOMElements: Не знайдено елемент '${key.replace('Element', '')}'! Перевір ID в HTML.`);
             allFound = false;
        }
    }
    // Перевірка колекцій кнопок
    if (!difficultyButtons || difficultyButtons.length !== 3) {
         console.error("Помилка initializeDOMElements: Не знайдено 3 кнопки складності!");
         allFound = false;
    }
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { // Має бути хоча б одна
        console.error("Помилка initializeDOMElements: Не знайдено кнопок фільтра часу лідерборду!");
        allFound = false;
    }
     if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { // Має бути хоча б одна
        console.error("Помилка initializeDOMElements: Не знайдено кнопок фільтра складності лідерборду!");
        allFound = false;
    }

    if (!allFound) {
        console.error("initializeDOMElements: Не всі DOM елементи знайдено. Подальша робота неможлива.");
        handleCriticalError("Помилка завантаження: відсутні необхідні елементи сторінки.");
        return false; // Повертаємо false
    }

    // Додаємо обробники подій, тільки якщо всі елементи знайдено
    console.log("initializeDOMElements: Додавання слухачів подій...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });

    console.log("DOM елементи успішно ініціалізовані та слухачі додані.");
    return true; // Все гаразд
}


// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() {
    console.log("Функція loginWithGoogle ВИКЛИКАНА!");
    if (!supabaseClient) return showError("Клієнт Supabase не ініціалізовано.");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) throw error;
        console.log("Перенаправлення на Google...");
    } catch (error) {
        console.error("Помилка входу через Google:", error);
        showError(`Login failed: ${error.message}`); // English
    }
}

async function logout() {
    if (!supabaseClient) return showError("Клієнт Supabase не ініціалізовано.");
    console.log("Вихід користувача...");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("Користувач успішно вийшов (через signOut).");
        // Стан UI оновиться через onAuthStateChange
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Logout failed: ${error.message}`); // English
    }
}

// Функція для оновлення UI залежно від стану автентифікації
function updateAuthStateUI(user) {
   console.log("Запуск updateAuthStateUI. User:", user ? user.id : 'null');
   // Переконуємось, що елементи вже ініціалізовані
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement || !showLeaderboardButton) {
       console.warn("updateAuthStateUI: DOM елементи ще не готові!");
       return; // Виходимо, якщо не готові
   }
   console.log("updateAuthStateUI: DOM елементи готові.");

   if (user) {
       // Користувач залогінений
       currentUser = user;
       console.log("updateAuthStateUI: Користувач є.");
       userEmailElement.textContent = user.email || 'unknown email'; // English
       userStatusElement.style.display = 'block'; // Показати статус
       loginButton.style.display = 'none';     // Сховати кнопку входу
       showLeaderboardButton.style.display = 'inline-block'; // Показати кнопку лідерборду

       // Показуємо вибір складності тільки якщо гра/результати/лідерборд не активні
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') {
            showDifficultySelection();
       } else {
           if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       }
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       // Користувач не залогінений
       currentUser = null;
       console.log("updateAuthStateUI: Користувач null.");
       if (loginButton) { loginButton.style.display = 'block'; } // Показуємо кнопку входу
       else { console.error("updateAuthStateUI: loginButton null!"); } // Цього не має бути
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block'; // Лідерборд доступний і для незалогінених
       // Зупиняємо та ховаємо гру/результати/лідерборд
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}

// Перевірка/Створення профілю користувача (версія без країни)
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`checkAndCreateUserProfile: Checking/creating profile for ${user.id}...`); // English
   try {
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`checkAndCreateUserProfile: Profile not found. Creating...`); // English
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail; // Use name from Google if available
           const profileDataToInsert = { id: user.id, username: potentialUsername, updated_at: new Date() };
           console.log("Data for profile insert:", profileDataToInsert);
           const { error: insertError } = await supabaseClient.from('profiles').insert(profileDataToInsert).select().single();
           if (insertError) throw insertError;
           console.log(`checkAndCreateUserProfile: Profile created.`); // English
       } else {
           console.log(`checkAndCreateUserProfile: Profile already exists.`); // English
       }
   } catch (error) {
       console.error("checkAndCreateUserProfile: Error:", error);
       showError(`Failed to check/create profile: ${error.message}`); // English
   }
}

// Слухач змін стану автентифікації
function setupAuthStateChangeListener() {
    if (!supabaseClient) { console.error("setupAuthStateChangeListener: supabaseClient not initialized!"); return; }
    console.log("Setting up onAuthStateChange listener..."); // English
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Auth State Change Event: ${_event}`, session ? `Session User ID: ${session.user?.id}` : 'No session'); // English
        const user = session?.user ?? null;
         // Оновлюємо UI ТІЛЬКИ якщо DOM готовий
         if (loginButton) { // Використовуємо loginButton як індикатор готовності DOM
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM not ready, UI update deferred."); // English
             currentUser = user; // Зберігаємо стан для initializeApp
         }
        // Перевірка/створення профілю тільки при SIGNED_IN
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        // Скидання гри при SIGNED_OUT
        if (_event === 'SIGNED_OUT') {
            console.log("SIGNED_OUT: Resetting game state."); // English
            stopTimer();
            selectedDifficulty = 1; // Reset difficulty state
            currentLeaderboardDifficulty = 1; // Reset leaderboard difficulty state
            currentLeaderboardTimeframe = 'all'; // Reset leaderboard time state
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
            if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
            if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; // Сховати і лідерборд
        }
    });
    console.log("onAuthStateChange listener setup complete."); // English
}

 // Перевірка початкового стану (чи користувач вже залогінений?)
 async function checkInitialAuthState() {
     if (!supabaseClient) { console.error("checkInitialAuthState: supabaseClient not initialized!"); return; };
     console.log("Checking initial authentication state..."); // English
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Initial session:", session ? `User ID: ${session.user?.id}` : 'null');
         currentUser = session?.user ?? null; // Встановлюємо currentUser
     } catch (error) {
         console.error("Error getting initial session:", error);
         currentUser = null; // Assume logged out on error
     }
 }

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    console.log("Calling displayQuestion with data:", questionData);
    if (!questionData) { console.error("displayQuestion: No data provided."); return; }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM elements not initialized!"); return;
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = "";
    stickerImageElement.alt = "Loading sticker...";
    console.log("Setting image src:", questionData.imageUrl);
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Error loading image: ${questionData.imageUrl}`);
        showError("Failed to load sticker image."); // English
        stickerImageElement.alt = "Image load error"; // English
        stickerImageElement.src = "";
        setTimeout(endGame, 500);
    };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Club Sticker"; }; // English

    optionsContainerElement.innerHTML = ''; // Очищаємо кнопки
    console.log("Creating buttons for options:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText) => {
             const button = document.createElement('button');
            button.textContent = optionText;
            button.disabled = false;
            button.classList.remove('correct-answer', 'incorrect-answer');
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
        });
        console.log("Button creation loop finished."); // English
    } else {
        console.error("Error: questionData.options is missing or not an array!");
        showError("Error displaying answer options."); // English
        setTimeout(endGame, 500); return;
    }

    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore; // Display current score

    if(gameAreaElement) gameAreaElement.style.display = 'block'; // Show game area
    if(resultAreaElement) resultAreaElement.style.display = 'none'; // Hide results

    startTimer(); // Start timer for the new question
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer();
    console.log(`Answer selected: ${selectedOption}`); // English
    hideError();
    if (!currentQuestionData || !optionsContainerElement) { console.error("handleAnswer: Missing data or options container"); return; }

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true); // Disable all buttons

    const isCorrect = selectedOption === currentQuestionData.correctAnswer;

    if (isCorrect) {
        console.log("Answer CORRECT!"); // English
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        // Add class to the correct button
        buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); });
        setTimeout(loadNextQuestion, 700); // Load next question after a short delay
    } else {
        console.log("Answer INCORRECT!"); // English
        // Add classes to highlight correct and incorrect answers
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer');
            if (button.textContent === selectedOption) button.classList.add('incorrect-answer');
        });
        setTimeout(endGame, 1500); // End game after a longer delay
    }
}

 // ----- 8. Функції таймера -----
function startTimer() {
    stopTimer();
    timeLeft = 10;
    if(!timeLeftElement) { console.error("startTimer: timeLeftElement not found!"); return; }
    timeLeftElement.textContent = timeLeft;
    console.log("Starting timer interval..."); // English
    timerInterval = setInterval(() => {
        timeLeft--;
        if(timeLeftElement) {
            try { timeLeftElement.textContent = timeLeft.toString(); }
            catch(e) { console.error("Error updating timer text:", e); stopTimer(); }
        } else { console.error("Timer tick: timeLeftElement disappeared!"); stopTimer(); return; }
        if (timeLeft <= 0) {
            console.log("Time is up!"); // English
            stopTimer();
             if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        button.style.outline = '2px solid orange';
                     }
                 });
             }
            setTimeout(endGame, 1500); // End game
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ----- 9. Функції керування грою -----
function showDifficultySelection() {
     console.log("Showing difficulty selection"); // English
     hideError();
      if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !leaderboardSectionElement) {
           console.error("DOM not ready for showDifficultySelection");
           if (!initializeDOMElements()) { handleCriticalError("UI Error."); return; }
      }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; // Show difficulty
     if(userStatusElement) userStatusElement.style.display = 'block'; // Show status
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { return; }
     selectedDifficulty = difficulty; // Set global difficulty
     console.log(`Difficulty selected: ${selectedDifficulty}`); // English
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Hide selection
     startGame(); // Start the game
}

async function startGame() {
    console.log(`Starting new game! Difficulty: ${selectedDifficulty}`); // English
    hideError();
    if (selectedDifficulty === null) { console.error("Cannot start game without difficulty!"); showDifficultySelection(); return; } // English
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !optionsContainerElement) {
        console.error("startGame: DOM elements not ready.");
        if (!initializeDOMElements()) { handleCriticalError("Failed to initialize elements."); return; } // English
    }
    currentScore = 0; // Reset score
    if (currentScoreElement) currentScoreElement.textContent = 0; // Update UI
    if (resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
         resultAreaElement.style.display = 'none'; // Hide results
    }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Hide difficulty selection
    if (gameAreaElement) gameAreaElement.style.display = 'block'; // Show game area
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } // Clear options
    if(userStatusElement) userStatusElement.style.display = 'none'; // Hide user status during game
    await loadNextQuestion(); // Load the first question
}

// Function to load the next question (FIXED)
async function loadNextQuestion() {
    console.log("loadNextQuestion: Calling loadNewQuestion..."); // English
    const questionData = await loadNewQuestion(); // Fetches data or null

    if (questionData) {
        // SUCCESS: Call displayQuestion here!
        console.log("loadNextQuestion: Data received, calling displayQuestion..."); // English
        displayQuestion(questionData); // <-- DISPLAY CALL
    } else {
        // ERROR: endGame should have been triggered from loadNewQuestion's catch block
        console.log("loadNextQuestion: Failed to load question data."); // English
        // Ensure UI is in a sensible state if endGame didn't trigger
         if(gameAreaElement) gameAreaElement.style.display = 'none';
         if(resultAreaElement) resultAreaElement.style.display = 'block'; // Show results area (score might be 0)
         if(userStatusElement) userStatusElement.style.display = 'block'; // Show user status
    }
}


// Function to load data for a new question (FIXED with .order())
 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) { console.error("loadNewQuestion: Client/difficulty not ready."); return null; }
  console.log(`Loading new question (Difficulty: ${selectedDifficulty})...`); // English
  showLoading();
  try {
    const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError) throw countError;
    if (stickerCount === null || stickerCount === 0) { throw new Error(`No stickers found for difficulty ${selectedDifficulty}!`); } // English
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError) throw totalClubCountError;
    if (totalClubCount === null || totalClubCount < 4) { throw new Error(`Not enough clubs (${totalClubCount}) in DB!`); } // English

    console.log(`Stickers found for difficulty ${selectedDifficulty}: ${stickerCount}`);
    const randomIndex = Math.floor(Math.random() * stickerCount);
    console.log(`Random index: ${randomIndex}`);

    // Fetch sticker with sorting
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`id, image_url, clubs ( id, name )`)
      .eq('difficulty', selectedDifficulty)
      .order('id', { ascending: true }) // Sorting
      .range(randomIndex, randomIndex)
      .single();

    if (stickerError) { throw new Error(`Error fetching sticker data: ${stickerError.message}`); } // English
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Failed to get sticker/club data."); } // English

    // Fetch incorrect options
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50);
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Not enough clubs for options."); // English
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Failed to select 3 unique options."); // English

    // Prepare question data
    const questionDataForDisplay = {
        imageUrl: randomStickerData.image_url,
        options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()),
        correctAnswer: correctClubName
    };
    console.log("Question data loaded successfully:", questionDataForDisplay); // English
    hideLoading();
    return questionDataForDisplay; // Return data

  } catch (error) {
    console.error("Error loading question:", error);
    showError(`Loading Error: ${error.message}`); // English
    hideLoading();
    setTimeout(endGame, 500); // End game on error
    return null; // Return null on error
  }
}

// Function to end the game
function endGame() {
     console.log(`Game Over! Final score: ${currentScore}`); // English
     stopTimer();
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove(); // Clear previous save message
        resultAreaElement.style.display = 'block'; // Show results area
     }
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     // Show user status again
     if(userStatusElement) userStatusElement.style.display = 'block';
     saveScore(); // Attempt to save the score
}

 // Function to save the score (with country and GeoIP debug)
 async function saveScore() {
     if (!currentUser) { console.log("saveScore: User not logged in."); return; }
     if (typeof currentScore !== 'number' || currentScore < 0) { console.log("saveScore: Invalid score."); return; }
     if (selectedDifficulty === null) { console.error("saveScore: Difficulty not set!"); return; }
     // Don't save zero scores
     if (currentScore === 0) {
          console.log("saveScore: Score is 0, not saving.");
          const scoreInfoMsg = document.createElement('p');
          scoreInfoMsg.textContent = 'Scores are saved only if greater than 0.'; // English
          scoreInfoMsg.style.fontSize = 'small'; scoreInfoMsg.style.marginTop = '5px'; scoreInfoMsg.classList.add('save-message');
          const scoreParagraph = finalScoreElement?.parentNode;
          if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); } }
          return;
     }
     console.log(`Attempting to save score: ${currentScore} (Difficulty: ${selectedDifficulty}) for user ${currentUser.id}`);
     showLoading();
     let detectedCountryCode = null;

     // --- GeoIP Debug Block ---
     console.log("DEBUG: Before fetch to ip-api.com");
     try {
         await fetch('https://ip-api.com/json/?fields=status,message,countryCode')
             .then(response => { console.log("DEBUG: Fetch response (status):", response.status, response.statusText); if (!response.ok) { console.error("DEBUG: Fetch NOT ok:", response.statusText); return response.text().then(text => { console.error("DEBUG: Error response body:", text); throw new Error(`GeoIP Error: ${response.statusText}`); }); } console.log("DEBUG: Getting JSON..."); return response.json(); })
             .then(data => { console.log("DEBUG: JSON data:", data); if (data && data.status === 'success' && data.countryCode) { detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase(); console.log(`DEBUG: Country detected as ${detectedCountryCode}`); } else { console.warn("DEBUG: Could not determine country from data:", data); } })
             .catch(fetchError => { console.error("DEBUG: Error in fetch/json promise:", fetchError); });
     } catch (outerError) { console.error("DEBUG: Unexpected error around fetch:", outerError); }
     console.log("DEBUG: After fetch block. detectedCountryCode =", detectedCountryCode);
     // --- End GeoIP Debug Block ---

     // --- DB Save Block ---
     try {
         console.log(`Saving to DB: user=${currentUser.id}, score=${currentScore}, difficulty=${selectedDifficulty}, country=${detectedCountryCode}`);
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore,
                 difficulty: selectedDifficulty,
                 country_code: detectedCountryCode // Pass detected code (or null)
             });
         if (error) {
            if (error.code === '42501') { throw new Error("Permission denied to save score (RLS)."); }
            else if (error.code === '23503') { throw new Error("Error linking score to user profile."); }
            else if (error.message.includes("value too long for type character varying(2)")) { throw new Error(`Error: Country code '${detectedCountryCode}' is too long.`);}
            else { throw error; }
         }
         console.log("Score saved successfully!");
         // Display success message
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Your score has been saved!'; // English
         scoreSavedMessage.style.fontSize = 'small'; scoreSavedMessage.style.marginTop = '5px'; scoreSavedMessage.classList.add('save-message');
         const scoreParagraph = finalScoreElement?.parentNode;
         if (resultAreaElement && scoreParagraph) {
             const existingMsg = resultAreaElement.querySelector('.save-message');
             if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling); }
         }
     } catch (error) {
         console.error("Error saving score:", error);
         showError(`Failed to save your score: ${error.message}`); // English
     } finally {
         hideLoading();
     }
 }


// ----- 10. Leaderboard Logic -----
function calculateTimeRange(timeframe) {
    const now = new Date(); let fromDate = null; let toDate = null;
    switch (timeframe) {
        case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break;
        case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break;
        case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break;
        case 'all': default: fromDate = null; toDate = null; break;
    }
    // console.log(`calculateTimeRange: timeframe=${timeframe}, from=${fromDate}, to=${toDate}`);
    return { fromDate, toDate };
}

async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) { showError("Connection error."); return null; }
    console.log(`WorkspaceLeaderboardData: Loading: time=${timeframe}, difficulty=${difficulty}`);
    showLoading(); hideError();
    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe);
        let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty);
        if (fromDate) { query = query.gte('created_at', fromDate); }
        if (toDate) { query = query.lt('created_at', toDate); }
        query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10);
        const { data, error } = await query;
        if (error) {
             if (error.message.includes('RLS policy')) { throw new Error("Permission denied reading scores/profiles (RLS)."); } // Simplified RLS check
             if (error.message.includes('relation "public.profiles" does not exist')) { throw new Error("Could not find profiles table."); }
             throw error;
        }
        console.log("fetchLeaderboardData: Data received:", data);
        return data;
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        showError(`Could not load leaderboard: ${error.message}`);
        return null;
    } finally {
        hideLoading();
    }
}

function displayLeaderboard(data) {
    console.log("displayLeaderboard: Displaying data:", data);
    if (!leaderboardListElement) { console.error("displayLeaderboard: List element not found!"); return; }
    leaderboardListElement.innerHTML = '';
    if (!data || data.length === 0) {
        leaderboardListElement.innerHTML = '<li>No results for this filter.</li>'; // English
        return;
    }
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Anonymous';
        // Rely on <ol> for numbering
        li.textContent = `${username} - ${entry.score}`;
        leaderboardListElement.appendChild(li);
    });
}

function updateFilterButtonsUI() {
    // console.log("updateFilterButtonsUI: Updating buttons..."); // Less verbose logging
    leaderboardTimeFilterButtons?.forEach(btn => {
        if (!btn.dataset.timeframe) return;
        const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe;
        btn.classList.toggle('active', isActive);
        btn.disabled = isActive;
    });
    leaderboardDifficultyFilterButtons?.forEach(btn => {
         if (!btn.dataset.difficulty) return;
         const btnDifficulty = parseInt(btn.dataset.difficulty, 10);
         const isActive = btnDifficulty === currentLeaderboardDifficulty;
         btn.classList.toggle('active', isActive);
         btn.disabled = isActive;
    });
}

async function updateLeaderboard() {
    console.log(`updateLeaderboard: Updating for time=${currentLeaderboardTimeframe}, difficulty=${currentLeaderboardDifficulty}`);
    if (!leaderboardListElement) { console.error("updateLeaderboard: List element not found!"); return; }
    leaderboardListElement.innerHTML = '<li>Loading...</li>'; // English
    updateFilterButtonsUI(); // Update button styles first
    const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty);
    displayLeaderboard(data); // Display fetched data
}

function handleTimeFilterChange(event) {
    const button = event.currentTarget;
    const newTimeframe = button.dataset.timeframe;
    console.log(`handleTimeFilterChange: Clicked. New timeframe: ${newTimeframe}`);
    if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) {
        currentLeaderboardTimeframe = newTimeframe;
        updateLeaderboard(); // Refresh leaderboard
    }
}

function handleDifficultyFilterChange(event) {
     const button = event.currentTarget;
    const newDifficulty = parseInt(button.dataset.difficulty, 10);
    console.log(`handleDifficultyFilterChange: Clicked. New difficulty: ${newDifficulty}`);
     if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) {
         currentLeaderboardDifficulty = newDifficulty;
         updateLeaderboard(); // Refresh leaderboard
    }
}

function openLeaderboard() {
    console.log("openLeaderboard called!");
    hideError();
     if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !authSectionElement || !leaderboardSectionElement) {
         console.error("openLeaderboard: DOM elements not initialized!");
         if (!initializeDOMElements()) { handleCriticalError("UI Error"); return; }
     }
    console.log("openLeaderboard: Hiding other sections...");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(userStatusElement) userStatusElement.style.display = 'none';
    if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; // Hide login button only if not logged in

    console.log("openLeaderboard: Showing leaderboard section...");
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';

    console.log("openLeaderboard: Calling updateLeaderboard...");
    // Set default filters for leaderboard before first fetch (or ensure they are set)
    currentLeaderboardTimeframe = currentLeaderboardTimeframe || 'all';
    currentLeaderboardDifficulty = currentLeaderboardDifficulty || 1;
    updateLeaderboard(); // Fetch and display data for current filters
}

function closeLeaderboard() {
     console.log("closeLeaderboard called!");
     if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
     // Show appropriate UI based on login state
     updateAuthStateUI(currentUser);
}


// ----- 11. Helper Functions -----
function showError(message) { console.error("Game Error:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Error: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Critical Error:", message); document.body.innerHTML = `<h1>Error</h1><p>${message}</p><p>Please refresh the page.</p>`; } // English
function showLoading() { console.log("Loading..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; } // English
function hideLoading() { console.log("...Loading finished"); if (loadingIndicator) loadingIndicator.style.display = 'none'; } // English

// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM loaded, initializing app...");
    // Initialize elements first and check success
    if (!initializeDOMElements()) {
        console.error("CRITICAL: Failed to initialize DOM elements on startup.");
        return; // Stop if elements missing
    }
    // Then setup auth listener
    setupAuthStateChangeListener();
    // Then update UI based on initial auth state
    // currentUser should be set by checkInitialAuthState by now
    updateAuthStateUI(currentUser);
    console.log("App initialized. Waiting for user actions.");
    // Ensure all dynamic sections are hidden initially
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    // showLeaderboardButton visibility is handled in updateAuthStateUI
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
}
