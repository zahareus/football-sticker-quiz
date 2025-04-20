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
    checkInitialAuthState();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
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
let currentUser = null;
let selectedDifficulty = null;

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;

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

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент з id '${key.replace('Element', '')}'!`);
             allFound = false;
        }
    }
    if (!difficultyButtons || difficultyButtons.length === 0) {
         console.error("Помилка: Не вдалося знайти кнопки вибору складності!");
         allFound = false;
    }

    if (!allFound) {
        handleCriticalError("Помилка ініціалізації інтерфейсу гри.");
        return false;
    }

    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => {
        button.addEventListener('click', handleDifficultySelection);
    });

    console.log("DOM елементи успішно ініціалізовані та слухачі додані.");
    return true;
}


// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() {
    console.log("Функція loginWithGoogle ВИКЛИКАНА!");
    if (!supabaseClient) return showError("Клієнт Supabase не ініціалізовано.");
    console.log("Спроба входу через Google...");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) throw error;
    } catch (error) {
        console.error("Помилка входу через Google:", error);
        showError(`Помилка входу: ${error.message}`);
    }
}

async function logout() {
    if (!supabaseClient) return showError("Клієнт Supabase не ініціалізовано.");
    console.log("Вихід користувача...");
    hideError();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("Користувач вийшов.");
        currentUser = null;
        selectedDifficulty = null;
        updateAuthStateUI(null);
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'none';
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Помилка виходу: ${error.message}`);
    }
}

function updateAuthStateUI(user) {
   if (!loginButton || !userStatusElement || !difficultySelectionElement) {
       console.warn("Auth UI: DOM елементи ще не готові.");
       return;
   }

   if (user) {
       currentUser = user;
       if(userEmailElement) userEmailElement.textContent = user.email || 'невідомий email';
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       showDifficultySelection();
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       currentUser = null;
       userStatusElement.style.display = 'none';
       loginButton.style.display = 'block';
       difficultySelectionElement.style.display = 'none';
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}

async function checkAndCreateUserProfile(user) {
   // Версія без GeoIP
   if (!supabaseClient || !user) return;
   console.log(`Перевірка/створення профілю для користувача ${user.id}...`);
   try {
       const { data, error: selectError } = await supabaseClient
           .from('profiles')
           .select('id')
           .eq('id', user.id)
           .maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`Профіль для ${user.id} не знайдено. Створення...`);
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
           const profileDataToInsert = { id: user.id, username: potentialUsername, updated_at: new Date() };
           console.log("Дані для вставки профілю:", profileDataToInsert);
           const { error: insertError } = await supabaseClient
               .from('profiles')
               .insert(profileDataToInsert)
               .select().single();
           if (insertError) throw insertError;
           console.log(`Профіль для ${user.id} успішно створено.`);
       } else {
           console.log(`Профіль для ${user.id} вже існує.`);
       }
   } catch (error) {
       console.error("Загальна помилка під час перевірки/створення профілю:", error);
       showError(`Не вдалося перевірити/створити профіль: ${error.message}`);
   }
}

function setupAuthStateChangeListener() {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Подія Auth State Change: ${_event}`, session);
        const user = session?.user ?? null;
         if (loginButton) {
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM ще не готовий для оновлення UI");
             currentUser = user;
         }
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        if (_event === 'SIGNED_OUT') {
            console.log("Користувач вийшов, скидання стану гри.");
            stopTimer();
            selectedDifficulty = null;
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
            if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
        }
    });
}

 async function checkInitialAuthState() {
     if (!supabaseClient) { /* ... */ return; };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session);
         currentUser = session?.user ?? null;
     } catch (error) { /* ... */ }
 }

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    console.log("Виклик displayQuestion з даними:", questionData); // Додамо лог
    if (!questionData) {
        console.error("displayQuestion: Немає даних для відображення.");
        return;
    }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM елементи не ініціалізовані!");
         return;
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = "";
    stickerImageElement.alt = "Завантаження стікера...";
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => { /* ... */ };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Стікер клубу"; };

    optionsContainerElement.innerHTML = '';
    console.log("Створення кнопок для варіантів:", questionData.options); // Додамо лог
    questionData.options.forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        button.disabled = false;
        button.style.backgroundColor = '';
        button.addEventListener('click', () => handleAnswer(optionText));
        optionsContainerElement.appendChild(button);
    });
    console.log("Кнопки створено та додано."); // Додамо лог

    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;

    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';

    startTimer(); // Запускаємо таймер
    console.log("Таймер запущено."); // Додамо лог
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer();
    console.log(`Обрано відповідь: ${selectedOption}`);
    hideError();
    if (!currentQuestionData || !optionsContainerElement) { /* ... */ return; }

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        buttons.forEach(button => {
            if (button.textContent === selectedOption) button.style.backgroundColor = 'lightgreen';
        });
        setTimeout(loadNextQuestion, 700);
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) button.style.backgroundColor = 'lightgreen';
            if (button.textContent === selectedOption) button.style.backgroundColor = 'salmon';
        });
        setTimeout(endGame, 1500);
    }
}

 // ----- 8. Функції таймера -----
function startTimer() {
     stopTimer();
    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    else { console.error("startTimer: timeLeftElement не знайдено!"); return; } // Перевірка

    console.log("Запуск інтервалу таймера..."); // Додамо лог
    timerInterval = setInterval(() => {
        timeLeft--;
        // console.log(`Таймер: ${timeLeft}`); // Додатковий лог для відладки таймера
        if(timeLeftElement) {
            timeLeftElement.textContent = timeLeft;
        } else {
            console.error("Timer tick: timeLeftElement не знайдено!");
            stopTimer(); // Зупинити таймер, якщо елемент зник
            return;
        }

        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer();
             if (optionsContainerElement && currentQuestionData) { /* ... */ }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}

function stopTimer() {
    // console.log("Зупинка таймера (інтервал:", timerInterval, ")"); // Додатковий лог
    clearInterval(timerInterval);
    timerInterval = null;
}

// ----- 9. Функції керування грою -----
function showDifficultySelection() {
     console.log("Показ вибору складності");
     hideError();
      if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) { /* ... */ return; }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
     if(userStatusElement) userStatusElement.style.display = 'block';
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { /* ... */ return; }
     selectedDifficulty = difficulty;
     console.log(`Обрано складність: ${selectedDifficulty}`);
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     startGame();
}

async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();
    if (selectedDifficulty === null) { /* ... */ return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement) { /* ... */ return; }
    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;
    if (resultAreaElement) { /* ... */ }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; }
    await loadNextQuestion();
}

// Функція завантаження наступного запитання (ВИПРАВЛЕНО)
async function loadNextQuestion() {
    console.log("Завантажуємо наступне запитання (виклик loadNewQuestion)...");
    const questionData = await loadNewQuestion(); // loadNewQuestion тепер повертає дані
    // Помилка вже оброблена всередині loadNewQuestion (вона викличе endGame)
    if (!questionData) {
        console.log("loadNextQuestion: Завантаження питання не вдалося, endGame має бути вже викликано.");
    }
    // НЕ викликаємо displayQuestion тут, бо його викликає loadNewQuestion
}


// Функція завантаження даних запитання (ВИПРАВЛЕНО)
 async function loadNewQuestion() {
  if (!supabaseClient) { /* ... */ return null; }
  if (selectedDifficulty === null) { /* ... */ return null; }
  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
  showLoading();
  try {
    // ... (Запити до Supabase як у попередній версії) ...
    const { count, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError) throw countError;
    if (count === null || count === 0) { throw new Error(`Для обраної складності (${selectedDifficulty}) немає стікерів!`); }
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError) throw totalClubCountError;
    if (totalClubCount === null || totalClubCount < 4) { throw new Error(`В базі недостатньо клубів (${totalClubCount})!`); }
    console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${count}`);
    const randomIndex = Math.floor(Math.random() * count);
    console.log(`Випадковий індекс: ${randomIndex}`);
    const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`id, image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).range(randomIndex, randomIndex).single();
    if (stickerError) { throw new Error(`Помилка отримання даних стікера: ${stickerError.message}`); }
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Не вдалося отримати дані стікера або клубу."); }
    const stickerImageUrl = randomStickerData.image_url;
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    console.log(`Вибраний стікер: URL=${stickerImageUrl}, ClubID=${correctClubId}, ClubName=${correctClubName}`);
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50);
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів для генерації варіантів.");
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 унікальних варіанти.");
    console.log(`Неправильні варіанти:`, incorrectOptions);
    const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
    console.log(`Всі варіанти (перемішані):`, allOptions);

    const questionDataForDisplay = { imageUrl: stickerImageUrl, options: allOptions, correctAnswer: correctClubName };

    hideLoading();
    // НЕ ВИКЛИКАЄМО displayQuestion ТУТ
    return questionDataForDisplay; // Повертаємо дані

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    showError(`Помилка завантаження: ${error.message}`);
    hideLoading();
    setTimeout(endGame, 500);
    return null;
  }
}

// Функція завершення гри
function endGame() {
     console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
     stopTimer();
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) { /* ... */ }
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     if(userStatusElement) userStatusElement.style.display = 'block';
     saveScore();
}

 // Функція збереження результату (з країною)
 async function saveScore() {
     // (Без змін від попередньої версії)
     if (!currentUser) { /* ... */ return; }
     if (typeof currentScore !== 'number' || currentScore < 0) { /* ... */ return; }
     if (selectedDifficulty === null) { /* ... */ return; }
     if (currentScore === 0) { /* ... */ return; }
     console.log(`Спроба збереження результату: ${currentScore} ...`);
     showLoading();
     let detectedCountryCode = null;
     try { /* ... GeoIP fetch ... */ } catch (geoError) { /* ... */ }
     try {
         console.log(`Зберігаємо в БД: ...`);
         const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode });
         if (error) { /* ... Обробка помилок insert ... */ throw error; }
         console.log("Результат успішно збережено!");
         const scoreSavedMessage = document.createElement('p'); /* ... */
         const scoreParagraph = finalScoreElement?.parentNode; /* ... */
         if (resultAreaElement && scoreParagraph) { /* ... */ }
     } catch (error) { /* ... */ } finally { hideLoading(); }
 }


// ----- 10. Допоміжні функції -----
function showError(message) { /* ... */ }
function hideError() { /* ... */ }
function handleCriticalError(message) { /* ... */ }
function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) { /* ... */ return; }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser);
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
}
