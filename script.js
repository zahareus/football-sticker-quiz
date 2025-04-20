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
    // Перевіряємо початковий стан auth, але ще НЕ оновлюємо UI
    checkInitialAuthState();
    // Чекаємо на повне завантаження DOM перед ініціалізацією елементів та UI
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
let currentUser = null;
let selectedDifficulty = null;

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;

// Функція знаходить елементи і додає слухачів
function initializeDOMElements() {
    console.log("initializeDOMElements: Пошук елементів..."); // Лог початку
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
        // Важливо: Не викликаємо handleCriticalError тут, щоб бачити детальні помилки в консолі
        console.error("initializeDOMElements: Не всі DOM елементи знайдено. Подальша ініціалізація може бути некоректною.");
        return false; // Повертаємо false, щоб initializeApp знала про проблему
    }

    // Додаємо обробники подій до кнопок ПІСЛЯ їх знаходження
    console.log("initializeDOMElements: Додавання слухачів подій...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => {
        button.addEventListener('click', handleDifficultySelection);
    });

    console.log("DOM елементи успішно ініціалізовані та слухачі додані.");
    return true; // Все гаразд
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
        // Стан UI оновиться через onAuthStateChange
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Помилка виходу: ${error.message}`);
    }
}

// Функція для оновлення UI залежно від стану автентифікації
function updateAuthStateUI(user) {
   console.log("Запуск updateAuthStateUI. User:", user);
   // Переконуємось, що елементи вже ініціалізовані
   if (!loginButton || !userStatusElement || !difficultySelectionElement) {
       console.warn("updateAuthStateUI: Спроба оновити UI до ініціалізації DOM елементів!");
       return; // Важливо вийти, якщо елементи не готові
   }
   console.log("updateAuthStateUI: DOM елементи готові.");

   if (user) {
       // Користувач залогінений
       currentUser = user;
       console.log("updateAuthStateUI: Користувач є.");
       if(userEmailElement) userEmailElement.textContent = user.email || 'невідомий email';
       if(userStatusElement) userStatusElement.style.display = 'block';
       if(loginButton) loginButton.style.display = 'none';
       // Показуємо вибір складності тільки якщо гра/результати не активні
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none') {
            showDifficultySelection();
       }
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       // Користувач не залогінений
       currentUser = null;
       console.log("updateAuthStateUI: Користувач null.");
       if (loginButton) {
           loginButton.style.display = 'block'; // Показуємо кнопку входу
           console.log("updateAuthStateUI: Показано loginButton.");
       } else {
            console.error("updateAuthStateUI: loginButton null/undefined!"); // Цього не має бути
       }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       // Зупинити гру та сховати її елементи
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}


// Перевірка/Створення профілю користувача (версія без країни)
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`Перевірка/створення профілю для користувача ${user.id}...`);
   try {
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError;
       if (!data) {
           console.log(`Профіль для ${user.id} не знайдено. Створення...`);
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
           const { error: insertError } = await supabaseClient.from('profiles').insert({ id: user.id, username: potentialUsername, updated_at: new Date() }).select().single();
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

// Слухач змін стану автентифікації
function setupAuthStateChangeListener() {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Подія Auth State Change: ${_event}`, session);
        const user = session?.user ?? null;
        // Оновлюємо UI ТІЛЬКИ якщо DOM готовий
         if (loginButton) { // Використовуємо loginButton як індикатор готовності DOM
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM ще не готовий для оновлення UI");
             // Просто зберігаємо користувача, UI оновиться в initializeApp
             currentUser = user;
         }
        // Створюємо профіль тільки при вході
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        // Скидаємо гру при виході
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

 // Перевірка початкового стану (чи користувач вже залогінений?)
 async function checkInitialAuthState() {
     if (!supabaseClient) { return; };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session);
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
    stickerImageElement.onerror = () => { /* ... */ };
    stickerImageElement.onload = () => { /* ... */ };
    optionsContainerElement.innerHTML = '';
    console.log("Створення кнопок для варіантів:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText, index) => { /* ... */ });
        console.log("Цикл створення кнопок завершено.");
    } else { /* ... */ }
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
    if (selectedOption === currentQuestionData.correctAnswer) { /* ... */ } else { /* ... */ }
}

 // ----- 8. Функції таймера -----
function startTimer() {
     stopTimer();
    timeLeft = 10;
    if(!timeLeftElement) { /* ... */ return; }
    timeLeftElement.textContent = timeLeft;
    console.log("Запуск інтервалу таймера (setInterval)...");
    timerInterval = setInterval(() => { /* ... */ }, 1000);
    console.log("setInterval викликано, timerInterval ID:", timerInterval);
}

function stopTimer() {
    if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
}

// ----- 9. Функції керування грою -----
function showDifficultySelection() {
     console.log("Показ вибору складності");
     hideError();
      if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) {
           console.error("DOM не готовий..."); if (!initializeDOMElements()) return;
      }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
     if(userStatusElement) userStatusElement.style.display = 'block';
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { return; }
     selectedDifficulty = difficulty;
     console.log(`Обрано складність: ${selectedDifficulty}`);
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     startGame();
}

async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();
    if (selectedDifficulty === null) { /* ... */ return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) { /* ... */ return; }
    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;
    if (resultAreaElement) { /* ... */ }
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; }
    if(userStatusElement) userStatusElement.style.display = 'none';
    await loadNextQuestion();
}

// Функція завантаження наступного запитання (ВИПРАВЛЕНО)
async function loadNextQuestion() {
    console.log("loadNextQuestion: Виклик loadNewQuestion...");
    const questionData = await loadNewQuestion(); // loadNewQuestion повертає дані або null

    if (questionData) {
        // УСПІХ: Викликаємо displayQuestion тут!
        console.log("loadNextQuestion: Отримано дані, викликаємо displayQuestion...");
        displayQuestion(questionData);
    } else {
        // ПОМИЛКА: endGame має бути викликано з loadNewQuestion
        console.log("loadNextQuestion: Завантаження питання не вдалося, endGame має бути вже викликано.");
    }
}

// Функція завантаження даних запитання (ВИПРАВЛЕНО)
 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) { console.error("..."); return null; }
  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
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
    const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`id, image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single();
    if (stickerError) { throw new Error(`Помилка отримання даних стікера: ${stickerError.message}`); }
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Не вдалося отримати дані стікера/клубу."); }
    const stickerImageUrl = randomStickerData.image_url;
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    console.log(`Вибраний стікер: URL=${stickerImageUrl}, ClubID=${correctClubId}, ClubName=${correctClubName}`);
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50);
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів для варіантів.");
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 варіанти.");
    console.log(`Неправильні варіанти:`, incorrectOptions);
    const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
    console.log(`Всі варіанти (перемішані):`, allOptions);
    const questionDataForDisplay = { imageUrl: stickerImageUrl, options: allOptions, correctAnswer: correctClubName };
    hideLoading();
    // НЕ викликаємо displayQuestion тут
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

 // Функція збереження результату (з країною та дебагом GeoIP)
 async function saveScore() {
     if (!currentUser) { /* ... */ return; }
     if (typeof currentScore !== 'number' || currentScore < 0) { /* ... */ return; }
     if (selectedDifficulty === null) { /* ... */ return; }
     if (currentScore === 0) { /* ... */ return; }
     console.log(`Спроба збереження результату: ${currentScore}...`);
     showLoading();
     let detectedCountryCode = null;
     // --- ПОЧАТОК ДЕБАГУ GeoIP ---
     console.log("ДЕБАГ: Перед викликом fetch до ip-api.com");
     try {
         await fetch('https://ip-api.com/json/?fields=status,message,countryCode')
             .then(response => { /* ... лог ... */ if (!response.ok) { /* ... */ throw new Error(`GeoIP Error: ${response.statusText}`); } return response.json(); })
             .then(data => { /* ... лог ... */ if (data && data.status === 'success' && data.countryCode) { /* ... */ } else { /* ... */ } })
             .catch(fetchError => { /* ... лог помилки fetch ... */ });
     } catch (outerError) { /* ... лог зовнішньої помилки ... */ }
     console.log("ДЕБАГ: Після блоку fetch. detectedCountryCode =", detectedCountryCode);
     // --- КІНЕЦЬ ДЕБАГУ GeoIP ---
     try {
         console.log(`Зберігаємо в БД: ... country=${detectedCountryCode}`);
         const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode });
         if (error) { /* ... Обробка помилок insert ... */ throw error; }
         console.log("Результат успішно збережено!");
         const scoreSavedMessage = document.createElement('p'); /* ... */
         const scoreParagraph = finalScoreElement?.parentNode; /* ... */
         if (resultAreaElement && scoreParagraph) { /* ... */ }
     } catch (error) { /* ... */ } finally { hideLoading(); }
 }


// ----- 10. Допоміжні функції -----
function showError(message) { console.error("Помилка гри:", message); if (errorMessageElement) { /* ... */ } else { alert(`Помилка: ${message}`); } }
function hideError() { if (errorMessageElement) { /* ... */ } }
function handleCriticalError(message) { console.error("Критична помилка:", message); document.body.innerHTML = `<h1>Помилка</h1><p>${message}</p><p>Будь ласка, оновіть сторінку.</p>`; }
function showLoading() { console.log("Показуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("Приховуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'none'; }

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) { // Спочатку ініціалізуємо елементи і додаємо слухачів
        console.error("Критична помилка ініціалізації DOM");
        return;
    }
    setupAuthStateChangeListener(); // Потім налаштовуємо слухача Auth
    updateAuthStateUI(currentUser); // Потім оновлюємо UI на основі currentUser (з checkInitialAuthState)
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    // Ховаємо все на старті
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    // Кнопка логіну буде показана в updateAuthStateUI, якщо currentUser=null
}
