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
    // Перевіряємо стан auth до завантаження DOM, щоб мати currentUser
    checkInitialAuthState();
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
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;

// ----- 4. DOM Елементи -----
// Оголошуємо змінні тут
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;

// Функція знаходить елементи і додає слухачів
function initializeDOMElements() {
    console.log("initializeDOMElements: Пошук елементів...");
    // Основні елементи
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
    difficultyButtons = document.querySelectorAll('.difficulty-button');
    // Елементи лідерборду
    leaderboardSectionElement = document.getElementById('leaderboard-section');
    leaderboardListElement = document.getElementById('leaderboard-list');
    closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    showLeaderboardButton = document.getElementById('show-leaderboard-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');
    // Індикатори
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');

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
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) {
        console.error("Помилка initializeDOMElements: Не знайдено кнопок фільтра часу!");
        allFound = false;
    }
     if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) {
        console.error("Помилка initializeDOMElements: Не знайдено кнопок фільтра складності лідерборду!");
        allFound = false;
    }

    if (!allFound) {
        console.error("initializeDOMElements: Не всі DOM елементи знайдено. Подальша робота неможлива.");
        // Можна викликати handleCriticalError або просто повернути false
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
        console.log("Користувач успішно вийшов (через signOut).");
        // UI та стан мають оновитися через onAuthStateChange
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Помилка виходу: ${error.message}`);
    }
}

// Функція для оновлення UI залежно від стану автентифікації
function updateAuthStateUI(user) {
   console.log("Запуск updateAuthStateUI. User:", user ? user.id : 'null');
   // Перевіряємо наявність ключових елементів UI
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement || !showLeaderboardButton) {
       console.warn("updateAuthStateUI: DOM елементи ще не готові або не знайдені!");
       return;
   }
   console.log("updateAuthStateUI: DOM елементи готові.");

   if (user) {
       // Користувач залогінений
       currentUser = user;
       console.log("updateAuthStateUI: Користувач є.");
       userEmailElement.textContent = user.email || 'невідомий email';
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
   console.log(`checkAndCreateUserProfile: Перевірка/створення профілю для ${user.id}...`);
   try {
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`checkAndCreateUserProfile: Профіль не знайдено. Створення...`);
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
           const { error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: potentialUsername, updated_at: new Date() }).select().single();
           if (insertError) throw insertError;
           console.log(`checkAndCreateUserProfile: Профіль створено.`);
       } else {
           console.log(`checkAndCreateUserProfile: Профіль вже існує.`);
       }
   } catch (error) {
       console.error("checkAndCreateUserProfile: Помилка:", error);
       showError(`Не вдалося перевірити/створити профіль: ${error.message}`);
   }
}

// Слухач змін стану автентифікації
function setupAuthStateChangeListener() {
    if (!supabaseClient) { console.error("setupAuthStateChangeListener: supabaseClient не ініціалізовано!"); return; }
    console.log("Налаштування слухача onAuthStateChange...");
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Подія Auth State Change: ${_event}`, session ? `Session User ID: ${session.user?.id}` : 'No session');
        const user = session?.user ?? null;
         // Оновлюємо UI ТІЛЬКИ якщо DOM готовий
         if (loginButton) { // Використовуємо loginButton як індикатор готовності DOM
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM ще не готовий, оновлення UI відкладено.");
             // Просто зберігаємо останній стан користувача, initializeApp оновить UI
             currentUser = user;
         }
        // Перевірка/створення профілю тільки при SIGNED_IN
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        // Скидання гри при SIGNED_OUT
        if (_event === 'SIGNED_OUT') {
            console.log("SIGNED_OUT: Скидання стану гри.");
            stopTimer();
            selectedDifficulty = null;
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
            if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
            if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
        }
    });
    console.log("Слухач onAuthStateChange налаштовано.");
}

 // Перевірка початкового стану (чи користувач вже залогінений?)
 async function checkInitialAuthState() {
     if (!supabaseClient) { console.error("checkInitialAuthState: supabaseClient не ініціалізовано!"); return; };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session ? `User ID: ${session.user?.id}` : 'null');
         currentUser = session?.user ?? null; // Встановлюємо currentUser
     } catch (error) {
         console.error("Помилка отримання початкової сесії:", error);
         currentUser = null; // Вважаємо не залогіненим при помилці
     }
 }

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    console.log("Виклик displayQuestion з даними:", questionData);
    if (!questionData) { console.error("displayQuestion: Немає даних."); return; }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM елементи не ініціалізовані!"); return;
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
        stickerImageElement.alt = "Помилка завантаження";
        stickerImageElement.src = "";
        setTimeout(endGame, 500);
    };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Стікер клубу"; };

    optionsContainerElement.innerHTML = '';
    console.log("Створення кнопок для варіантів:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText) => {
             const button = document.createElement('button');
            button.textContent = optionText;
            button.disabled = false;
            button.classList.remove('correct-answer', 'incorrect-answer'); // Очищаємо класи
            button.style.backgroundColor = ''; // Очищаємо стиль (якщо був inline)
            button.style.outline = ''; // Очищаємо стиль
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
        });
        console.log("Цикл створення кнопок завершено.");
    } else {
        console.error("Помилка: questionData.options не є масивом!");
        showError("Помилка відображення варіантів.");
        setTimeout(endGame, 500); return;
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
    buttons.forEach(button => button.disabled = true); // Вимикаємо кнопки

    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        // Додаємо клас до правильної кнопки
        buttons.forEach(button => { if (button.textContent === selectedOption) button.classList.add('correct-answer'); });
        setTimeout(loadNextQuestion, 700);
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        // Додаємо класи до правильної і неправильної кнопок
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) button.classList.add('correct-answer');
            if (button.textContent === selectedOption) button.classList.add('incorrect-answer');
        });
        setTimeout(endGame, 1500);
    }
}

 // ----- 8. Функції таймера -----
function startTimer() {
     stopTimer();
    timeLeft = 10;
    if(!timeLeftElement) { console.error("startTimer: timeLeftElement не знайдено!"); return; }
    timeLeftElement.textContent = timeLeft;
    console.log("Запуск інтервалу таймера...");
    timerInterval = setInterval(() => {
        timeLeft--;
        if(timeLeftElement) {
            try { timeLeftElement.textContent = timeLeft.toString(); }
            catch(e) { console.error("Помилка оновлення таймера:", e); stopTimer(); }
        } else { console.error("Timer tick: timeLeftElement зник!"); stopTimer(); return; }
        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer();
             if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        // button.classList.add('correct-answer'); // Можна додати клас і для тайм-ауту
                        button.style.outline = '2px solid orange'; // Або просто обведення
                     }
                 });
             }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ----- 9. Функції керування грою -----
function showDifficultySelection() {
     console.log("Показ вибору складності");
     hideError();
      if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !leaderboardSectionElement) {
           console.error("DOM не готовий для показу вибору складності");
           if (!initializeDOMElements()) { handleCriticalError("..."); return; }
      }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
     if(userStatusElement) userStatusElement.style.display = 'block'; // Статус теж видимий
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { return; }
     selectedDifficulty = difficulty; // Встановлюємо глобальну складність
     console.log(`Обрано складність: ${selectedDifficulty}`);
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Ховаємо вибір
     startGame(); // Починаємо гру
}

async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();
    if (selectedDifficulty === null) { console.error("Спроба почати гру без складності!"); showDifficultySelection(); return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) {
        console.error("startGame: Не всі DOM елементи готові.");
        if (!initializeDOMElements()) { handleCriticalError("Не вдалося ініціалізувати елементи."); return; }
    }
    currentScore = 0; // Скидаємо рахунок
    if (currentScoreElement) currentScoreElement.textContent = 0; // Оновлюємо UI
    if (resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
         resultAreaElement.style.display = 'none'; // Ховаємо результати
    }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Ховаємо вибір складності
    if (gameAreaElement) gameAreaElement.style.display = 'block'; // Показуємо ігрову зону
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } // Очищаємо опції
    if(userStatusElement) userStatusElement.style.display = 'none'; // Ховаємо статус під час гри
    await loadNextQuestion(); // Завантажуємо перше питання
}

// Функція завантаження наступного запитання (ВИПРАВЛЕНО)
async function loadNextQuestion() {
    console.log("loadNextQuestion: Виклик loadNewQuestion...");
    const questionData = await loadNewQuestion(); // loadNewQuestion повертає дані або null

    if (questionData) {
        // УСПІХ: Викликаємо displayQuestion тут!
        console.log("loadNextQuestion: Отримано дані, викликаємо displayQuestion...");
        displayQuestion(questionData); // <--- ВИКЛИК ДЛЯ ВІДОБРАЖЕННЯ
    } else {
        // ПОМИЛКА: endGame вже має бути викликано з loadNewQuestion
        console.log("loadNextQuestion: Завантаження питання не вдалося.");
         // Можна додатково показати екран результатів для надійності
         if(gameAreaElement) gameAreaElement.style.display = 'none';
         if(resultAreaElement) resultAreaElement.style.display = 'block';
         if(userStatusElement) userStatusElement.style.display = 'block';
    }
}

// Функція завантаження даних запитання (ВИПРАВЛЕНО)
 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) { console.error("..."); return null; }
  console.log(`Завантаження запитання (Складність: ${selectedDifficulty})...`);
  showLoading();
  try {
    const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError) throw countError;
    if (stickerCount === null || stickerCount === 0) { throw new Error(`Для складності ${selectedDifficulty} немає стікерів!`); }
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError) throw totalClubCountError;
    if (totalClubCount === null || totalClubCount < 4) { throw new Error(`В базі недостатньо клубів (${totalClubCount})!`); }

    console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${stickerCount}`);
    const randomIndex = Math.floor(Math.random() * stickerCount);
    console.log(`Випадковий індекс: ${randomIndex}`);

    // Отримуємо стікер з сортуванням
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`id, image_url, clubs ( id, name )`)
      .eq('difficulty', selectedDifficulty)
      .order('id', { ascending: true }) // Сортування
      .range(randomIndex, randomIndex)
      .single();

    if (stickerError) { throw new Error(`Помилка отримання стікера: ${stickerError.message}`); }
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Не вдалося отримати дані стікера/клубу."); }

    // ... (Отримання неправильних варіантів) ...
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50);
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів для варіантів.");
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 варіанти.");

    const questionDataForDisplay = {
        imageUrl: randomStickerData.image_url,
        options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()),
        correctAnswer: correctClubName
    };
    console.log("Дані для запитання успішно завантажено.");
    hideLoading();
    return questionDataForDisplay; // Повертаємо дані

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    showError(`Помилка завантаження: ${error.message}`);
    hideLoading();
    setTimeout(endGame, 500); // Завершуємо гру при помилці
    return null; // Повертаємо null
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
     if(userStatusElement) userStatusElement.style.display = 'block'; // Показуємо статус
     saveScore(); // Викликаємо збереження
}

 // Функція збереження результату (з країною та дебагом GeoIP)
 async function saveScore() {
     if (!currentUser) { console.log("saveScore: Немає користувача."); return; }
     if (typeof currentScore !== 'number' || currentScore < 0) { console.log("saveScore: Немає рахунку."); return; }
     if (selectedDifficulty === null) { console.error("saveScore: Складність не встановлена!"); return; }
     // Не зберігаємо нульові результати
     if (currentScore === 0) {
          console.log("saveScore: Рахунок 0, не зберігаємо.");
          const scoreInfoMsg = document.createElement('p');
          scoreInfoMsg.textContent = 'Результати зберігаються тільки якщо рахунок більше 0.';
          scoreInfoMsg.style.fontSize = 'small'; scoreInfoMsg.style.marginTop = '5px'; scoreInfoMsg.classList.add('save-message');
          const scoreParagraph = finalScoreElement?.parentNode;
          if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); } }
          return;
     }
     console.log(`Спроба збереження результату: ${currentScore} (Складність: ${selectedDifficulty}) для користувача ${currentUser.id}`);
     showLoading();
     let detectedCountryCode = null;

     // --- ПОЧАТОК ДЕБАГУ GeoIP ---
     console.log("ДЕБАГ: Перед викликом fetch до ip-api.com");
     try {
         await fetch('https://ip-api.com/json/?fields=status,message,countryCode')
             .then(response => { console.log("ДЕБАГ: Fetch відповідь (status):", response.status, response.statusText); if (!response.ok) { console.error("ДЕБАГ: Fetch НЕ ok:", response.statusText); return response.text().then(text => { console.error("ДЕБАГ: Тіло відповіді:", text); throw new Error(`GeoIP Error: ${response.statusText}`); }); } console.log("ДЕБАГ: Отримання JSON..."); return response.json(); })
             .then(data => { console.log("ДЕБАГ: JSON дані:", data); if (data && data.status === 'success' && data.countryCode) { detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase(); console.log(`ДЕБАГ: Країну визначено як ${detectedCountryCode}`); } else { console.warn("ДЕБАГ: Не вдалося визначити країну з даних:", data); } })
             .catch(fetchError => { console.error("ДЕБАГ: Помилка fetch/json:", fetchError); });
     } catch (outerError) { console.error("ДЕБАГ: Неочікувана помилка fetch:", outerError); }
     console.log("ДЕБАГ: Після блоку fetch. detectedCountryCode =", detectedCountryCode);
     // --- КІНЕЦЬ ДЕБАГУ GeoIP ---

     // --- Початок блоку збереження в БД ---
     try {
         console.log(`Зберігаємо в БД: user=${currentUser.id}, score=${currentScore}, difficulty=${selectedDifficulty}, country=${detectedCountryCode}`);
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore,
                 difficulty: selectedDifficulty,
                 country_code: detectedCountryCode // Передаємо отриманий код (або null)
             });
         if (error) {
            if (error.code === '42501') { throw new Error("Немає дозволу на збереження результату."); }
            else if (error.code === '23503') { throw new Error("Помилка зв'язку з профілем користувача."); }
            else if (error.message.includes("value too long for type character varying(2)")) { throw new Error(`Помилка: Код країни '${detectedCountryCode}' задовгий.`);}
            else { throw error; } // Інша помилка бази даних
         }
         console.log("Результат успішно збережено!");
         // Показуємо повідомлення про успішне збереження
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Ваш результат збережено!';
         scoreSavedMessage.style.fontSize = 'small'; scoreSavedMessage.style.marginTop = '5px'; scoreSavedMessage.classList.add('save-message');
         const scoreParagraph = finalScoreElement?.parentNode;
         if (resultAreaElement && scoreParagraph) {
             const existingMsg = resultAreaElement.querySelector('.save-message');
             if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling); }
         }
     } catch (error) {
         console.error("Помилка збереження результату:", error);
         showError(`Не вдалося зберегти ваш результат: ${error.message}`);
     } finally {
         hideLoading(); // Завжди ховаємо індикатор
     }
 }


// ----- 10. ЛОГІКА ЛІДЕРБОРДУ -----
// Допоміжна функція для розрахунку діапазонів дат в UTC
function calculateTimeRange(timeframe) {
    const now = new Date(); let fromDate = null; let toDate = null;
    switch (timeframe) {
        case 'today': const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); const startOfNextDay = new Date(startOfDay); startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1); fromDate = startOfDay.toISOString(); toDate = startOfNextDay.toISOString(); break;
        case 'week': const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); fromDate = sevenDaysAgo.toISOString(); break;
        case 'month': const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); fromDate = thirtyDaysAgo.toISOString(); break;
        case 'all': default: fromDate = null; toDate = null; break;
    }
    console.log(`calculateTimeRange: timeframe=${timeframe}, from=${fromDate}, to=${toDate}`);
    return { fromDate, toDate };
}

// Функція завантаження даних для лідерборду
async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) { showError("Немає підключення."); return null; }
    console.log(`WorkspaceLeaderboardData: Завантаження: час=${timeframe}, складність=${difficulty}`);
    showLoading(); hideError();
    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe);
        let query = supabaseClient.from('scores').select(`score, created_at, profiles ( username )`).eq('difficulty', difficulty);
        if (fromDate) { query = query.gte('created_at', fromDate); }
        if (toDate) { query = query.lt('created_at', toDate); }
        query = query.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(10);
        const { data, error } = await query;
        if (error) {
             if (error.message.includes('violates row-level security policy for table "scores"')) { throw new Error("Немає доступу до результатів (scores RLS)."); }
             if (error.message.includes('violates row-level security policy for table "profiles"')) { throw new Error("Немає доступу до імен гравців (profiles RLS)."); }
             if (error.message.includes('relation "public.profiles" does not exist')) { throw new Error("Не знайдено таблицю профілів."); }
             throw error;
        }
        console.log("fetchLeaderboardData: Дані отримано:", data);
        return data;
    } catch (error) {
        console.error("Помилка завантаження лідерборду:", error);
        showError(`Не вдалося завантажити лідерборд: ${error.message}`);
        return null;
    } finally {
        hideLoading();
    }
}

// Функція відображення даних лідерборду
function displayLeaderboard(data) {
    console.log("displayLeaderboard: Відображення даних:", data);
    if (!leaderboardListElement) { console.error("displayLeaderboard: Елемент списку не знайдено!"); return; }
    leaderboardListElement.innerHTML = ''; // Очистити
    if (!data || data.length === 0) {
        leaderboardListElement.innerHTML = '<li>Немає результатів для цього фільтру.</li>';
        return;
    }
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Анонім'; // Обробка випадку, якщо профіль не знайдено або null
        li.textContent = `${index + 1}. ${username} - ${entry.score}`;
        leaderboardListElement.appendChild(li);
    });
}

// Оновлення активних кнопок фільтрів
function updateFilterButtonsUI() {
    console.log("updateFilterButtonsUI: Оновлення кнопок...");
    leaderboardTimeFilterButtons?.forEach(btn => {
        if (!btn.dataset.timeframe) return;
        const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe;
        btn.classList.toggle('active', isActive); // Додати/видалити клас
        btn.disabled = isActive; // Вимкнути активну
    });
    leaderboardDifficultyFilterButtons?.forEach(btn => {
         if (!btn.dataset.difficulty) return;
         const btnDifficulty = parseInt(btn.dataset.difficulty, 10);
         const isActive = btnDifficulty === currentLeaderboardDifficulty;
         btn.classList.toggle('active', isActive);
         btn.disabled = isActive;
    });
}


// Головна функція для оновлення лідерборду
async function updateLeaderboard() {
    console.log(`updateLeaderboard: Початок оновлення для час=${currentLeaderboardTimeframe}, складність=${currentLeaderboardDifficulty}`);
    if (!leaderboardListElement) { console.error("updateLeaderboard: leaderboardListElement не знайдено!"); return; }
    leaderboardListElement.innerHTML = '<li>Завантаження...</li>'; // Показати завантаження
    updateFilterButtonsUI(); // Оновити вигляд кнопок
    const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty);
    displayLeaderboard(data); // Відобразити отримані дані
}

// Обробники зміни фільтрів
function handleTimeFilterChange(event) {
    const button = event.currentTarget;
    const newTimeframe = button.dataset.timeframe;
    console.log(`handleTimeFilterChange: Клік. Новий період: ${newTimeframe}`);
    if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) {
        currentLeaderboardTimeframe = newTimeframe;
        updateLeaderboard(); // Оновити лідерборд
    }
}

function handleDifficultyFilterChange(event) {
     const button = event.currentTarget;
    const newDifficulty = parseInt(button.dataset.difficulty, 10);
    console.log(`handleDifficultyFilterChange: Клік. Нова складність: ${newDifficulty}`);
     if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) {
         currentLeaderboardDifficulty = newDifficulty;
         updateLeaderboard(); // Оновити лідерборд
    }
}

// Функції відкриття/закриття лідерборду
function openLeaderboard() {
    console.log("openLeaderboard: Функція викликана!");
    hideError();
     if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement || !authSectionElement || !leaderboardSectionElement) {
         console.error("openLeaderboard: Не всі DOM елементи ініціалізовані!");
         // Спробувати ініціалізувати ще раз
         if (!initializeDOMElements()) {
              handleCriticalError("Критична помилка: не вдалося знайти DOM елементи для відкриття лідерборду.");
              return;
         }
     }
    console.log("openLeaderboard: Приховування інших секцій...");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(userStatusElement) userStatusElement.style.display = 'none'; // Ховаємо і статус
    if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; // Ховаємо кнопку логіну

    console.log("openLeaderboard: Показ секції лідерборду...");
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';

    console.log("openLeaderboard: Виклик updateLeaderboard...");
    updateLeaderboard(); // Завантажити дані при відкритті
}

function closeLeaderboard() {
     console.log("closeLeaderboard: Функція викликана!");
     if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
     // Показати відповідний стан UI (кнопка логіну або вибір складності)
     updateAuthStateUI(currentUser);
}


// ----- 11. Допоміжні функції -----
function showError(message) { console.error("Помилка гри:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Помилка: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Критична помилка:", message); document.body.innerHTML = `<h1>Помилка</h1><p>${message}</p><p>Будь ласка, оновіть сторінку.</p>`; }
function showLoading() { console.log("Завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("...Завантаження завершено"); if (loadingIndicator) loadingIndicator.style.display = 'none'; }

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    // Спочатку ініціалізуємо елементи
    if (!initializeDOMElements()) {
        console.error("Критична помилка ініціалізації DOM під час запуску initializeApp.");
        // Не викликаємо handleCriticalError, бо initializeDOMElements вже вивела помилки
        return; // Не продовжувати, якщо елементи не знайдено
    }
    // Потім налаштовуємо слухача Auth
    setupAuthStateChangeListener();
    // Потім оновлюємо UI на основі currentUser (отриманого з checkInitialAuthState)
    updateAuthStateUI(currentUser);
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    // Ховаємо все зайве на старті
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     // Кнопка лідерборду має бути видима, якщо вона є, але сам лідерборд - ні
     if (showLeaderboardButton) showLeaderboardButton.style.display = 'inline-block';
     if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';
}
