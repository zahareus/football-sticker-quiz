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
   console.log("Запуск updateAuthStateUI. User:", user);
   if (!loginButton || !userStatusElement || !difficultySelectionElement) {
       console.warn("updateAuthStateUI: DOM елементи ще не готові для оновлення.");
       return;
   }
   console.log("updateAuthStateUI: DOM елементи готові.");

   if (user) {
       currentUser = user;
       console.log("updateAuthStateUI: Користувач є. loginButton:", loginButton);
       if(userEmailElement) userEmailElement.textContent = user.email || 'невідомий email';
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       // Тільки показуємо вибір складності, НЕ стартуємо гру
       showDifficultySelection();
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       currentUser = null;
       console.log("updateAuthStateUI: Користувач null. Trying to show login button.");
       console.log("updateAuthStateUI: loginButton element:", loginButton);
       if (loginButton) {
           loginButton.style.display = 'block';
       } else {
            console.error("updateAuthStateUI: loginButton все ще null тут!");
       }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
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
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`Профіль для ${user.id} не знайдено. Створення...`);
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
           const profileDataToInsert = { id: user.id, username: potentialUsername, updated_at: new Date() };
           console.log("Дані для вставки профілю:", profileDataToInsert);
           const { error: insertError } = await supabaseClient.from('profiles').insert(profileDataToInsert).select().single();
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
     if (!supabaseClient) { return; };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session);
         currentUser = session?.user ?? null;
     } catch (error) { console.error("Помилка отримання початкової сесії:", error); currentUser = null; }
 }

// ----- 6. Функція для відображення запитання на сторінці (ДОДАНО ЛОГИ) -----
function displayQuestion(questionData) {
    console.log("Виклик displayQuestion з даними:", questionData);
    if (!questionData) {
        console.error("displayQuestion: Немає даних для відображення.");
        return;
    }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM елементи не ініціалізовані!");
         // Спробувати ініціалізувати ще раз? Або просто вийти
         if (!initializeDOMElements()) {
            handleCriticalError("Критична помилка: не вдалося знайти DOM елементи під час відображення питання.");
            return;
         }
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = "";
    stickerImageElement.alt = "Завантаження стікера...";
    console.log("Встановлення src зображення:", questionData.imageUrl);
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
        stickerImageElement.src = "";
        setTimeout(endGame, 500);
    };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Стікер клубу"; };

    optionsContainerElement.innerHTML = ''; // Очищаємо кнопки
    console.log("Створення кнопок для варіантів:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText, index) => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.disabled = false;
            button.style.backgroundColor = '';
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
            console.log(`Кнопку "${optionText}" (індекс ${index}) додано.`); // <-- ДОДАНО ЛОГ
        });
        console.log("Цикл створення кнопок завершено."); // <-- ДОДАНО ЛОГ
    } else {
        console.error("Помилка: questionData.options не є масивом або відсутній!");
        showError("Помилка відображення варіантів відповіді.");
        return; // Зупинити виконання, якщо немає опцій
    }


    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;

    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';

    startTimer();
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer();
    console.log(`Обрано відповідь: ${selectedOption}`);
    hideError();
    if (!currentQuestionData || !optionsContainerElement) { return; }
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        buttons.forEach(button => { if (button.textContent === selectedOption) button.style.backgroundColor = 'lightgreen'; });
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

 // ----- 8. Функції таймера (ДОДАНО ЛОГИ) -----
function startTimer() {
     stopTimer(); // Зупинити попередній, якщо є
    timeLeft = 10;
    if(!timeLeftElement) { console.error("startTimer: timeLeftElement не знайдено!"); return; }
    timeLeftElement.textContent = timeLeft; // Встановити початкове значення

    console.log("Запуск інтервалу таймера (setInterval)...");
    timerInterval = setInterval(() => {
        timeLeft--;
        console.log(`Timer Tick: timeLeft=${timeLeft}`); // <-- ДОДАНО ЛОГ
        if(timeLeftElement) {
            try { // Додамо try-catch на випадок проблем з оновленням DOM
                 timeLeftElement.textContent = timeLeft.toString(); // Оновлюємо текст
            } catch(e) {
                 console.error("Помилка оновлення тексту таймера:", e);
                 stopTimer();
            }
        } else {
            console.error("Timer tick: timeLeftElement не знайдено всередині інтервалу!");
            stopTimer();
            return;
        }

        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer();
            // Вимикаємо кнопки та показуємо правильну відповідь
            if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        button.style.backgroundColor = 'lightgreen';
                     }
                 });
             }
            setTimeout(endGame, 1500); // Завершуємо гру
        }
    }, 1000); // Інтервал 1 секунда
    console.log("setInterval викликано, timerInterval ID:", timerInterval);
}

function stopTimer() {
    if (timerInterval !== null) {
        console.log("Зупинка таймера ID:", timerInterval);
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ----- 9. Функції керування грою -----
function showDifficultySelection() {
     console.log("Показ вибору складності");
     hideError();
      if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) {
           console.error("DOM не готовий для показу вибору складності");
           if (!initializeDOMElements()) return;
      }
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
    if(userStatusElement) userStatusElement.style.display = 'none'; // Ховаємо статус під час гри
    await loadNextQuestion();
}

// Функція завантаження наступного запитання (ВИПРАВЛЕНО)
async function loadNextQuestion() {
    console.log("loadNextQuestion: Виклик loadNewQuestion...");
    const questionData = await loadNewQuestion();

    if (questionData) {
        // НЕ викликаємо displayQuestion тут, бо його викликає loadNewQuestion
        console.log("loadNextQuestion: Нове запитання отримано, displayQuestion мав бути викликаний з loadNewQuestion.");
    } else {
        console.log("loadNextQuestion: Завантаження питання не вдалося, endGame має бути вже викликано.");
    }
}


// Функція завантаження даних запитання (ВИПРАВЛЕНО)
 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) { /* ... */ return null; }
  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
  showLoading();
  try {
    const { count, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError) throw countError;
    if (count === null || count === 0) { throw new Error(`Для обраної складності (${selectedDifficulty}) немає стікерів!`); }
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError) throw totalClubCountError;
    if (totalClubCount === null || totalClubCount < 4) { throw new Error(`В базі недостатньо клубів (${totalClubCount})!`); }
    console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${count}`);
    const randomIndex = Math.floor(Math.random() * count);
    console.log(`Випадковий індекс: ${randomIndex}`);
    const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`id, image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single();
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

    // !!! ВИПРАВЛЕННЯ: ПОВЕРТАЄМО ВИКЛИК displayQuestion СЮДИ !!!
    // Бо loadNextQuestion його більше не викликає.
    displayQuestion(questionDataForDisplay);

    hideLoading();
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
     if(resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
        resultAreaElement.style.display = 'block';
     }
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     if(userStatusElement) userStatusElement.style.display = 'block'; // Показати знову статус
     saveScore();
}

 // Функція збереження результату (з країною)
 async function saveScore() {
     // Версія з GeoIP
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
function showError(message) {
    console.error("Помилка гри:", message);
    if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; }
    else { alert(`Помилка: ${message}`); }
}
function hideError() {
    if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; }
}
function handleCriticalError(message) {
    console.error("Критична помилка:", message);
    document.body.innerHTML = `<h1>Помилка</h1><p>${message}</p><p>Будь ласка, оновіть сторінку.</p>`;
}
function showLoading() {
    console.log("Показуємо індикатор завантаження...");
    if (loadingIndicator) loadingIndicator.style.display = 'block';
}
function hideLoading() {
    console.log("Приховуємо індикатор завантаження...");
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) { return; }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser);
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
}
