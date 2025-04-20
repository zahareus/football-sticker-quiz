// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
if (typeof supabase === 'undefined') { /* ... */ } else { /* ... */ }

// ----- 3. Глобальні змінні -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;
let currentUser = null;
let selectedDifficulty = 1; // За замовчуванням - легка складність
// Змінні стану лідерборду
let currentLeaderboardTimeframe = 'all'; // 'today', 'week', 'month', 'all'
let currentLeaderboardDifficulty = 1;   // 1, 2, 3

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;
// Нові елементи для лідерборду
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons;


// Ініціалізація DOM елементів (ДОДАНО ЕЛЕМЕНТИ ЛІДЕРБОРДУ)
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


    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент з id '${key.replace('Element', '')}'!`);
             allFound = false;
        }
    }
    if (!difficultyButtons || difficultyButtons.length === 0) { /* ... */ allFound = false; }
    // Перевірка кнопок фільтрів
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) {
        console.error("Помилка: Не вдалося знайти кнопки фільтра часу лідерборду!");
        allFound = false;
    }
     if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) {
        console.error("Помилка: Не вдалося знайти кнопки фільтра складності лідерборду!");
        allFound = false;
    }

    if (!allFound) {
        handleCriticalError("Помилка ініціалізації інтерфейсу гри.");
        return false;
    }

    // Додаємо обробники подій
    console.log("initializeDOMElements: Додавання слухачів подій...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    // Слухачі для лідерборду
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });


    console.log("DOM елементи успішно ініціалізовані та слухачі додані.");
    return true;
}


// ----- 5. Функції Автентифікації -----
// (Без змін)
async function loginWithGoogle() { /* ... */ }
async function logout() { /* ... */ }
function updateAuthStateUI(user) { /* ... */ }
async function checkAndCreateUserProfile(user) { /* ... */ }
function setupAuthStateChangeListener() { /* ... */ }
async function checkInitialAuthState() { /* ... */ }

// ----- 6. Функція для відображення запитання на сторінці -----
// (Без змін)
function displayQuestion(questionData) { /* ... */ }

// ----- 7. Функція обробки відповіді користувача -----
// (Без змін)
function handleAnswer(selectedOption) { /* ... */ }

 // ----- 8. Функції таймера -----
 // (Без змін)
function startTimer() { /* ... */ }
function stopTimer() { /* ... */ }

// ----- 9. Функції керування грою -----
// (Без змін)
function showDifficultySelection() { /* ... */ }
function handleDifficultySelection(event) { /* ... */ }
async function startGame() { /* ... */ }
async function loadNextQuestion() { /* ... */ }
async function loadNewQuestion() { /* ... */ }
function endGame() { /* ... */ }
async function saveScore() { /* ... */ } // Версія з GeoIP

// ----- 10. ЛОГІКА ЛІДЕРБОРДУ -----

// Допоміжна функція для розрахунку діапазонів дат в UTC
function calculateTimeRange(timeframe) {
    const now = new Date();
    let fromDate = null;
    let toDate = null; // Потрібен тільки для 'today'

    switch (timeframe) {
        case 'today':
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const startOfNextDay = new Date(startOfDay);
            startOfNextDay.setDate(startOfDay.getDate() + 1);
            fromDate = startOfDay.toISOString();
            toDate = startOfNextDay.toISOString();
            break;
        case 'week':
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0); // Початок дня 7 днів тому
            fromDate = sevenDaysAgo.toISOString();
            break;
        case 'month':
            const thirtyDaysAgo = new Date(now); // Простіше - останні 30 днів
            thirtyDaysAgo.setDate(now.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            fromDate = thirtyDaysAgo.toISOString();
            // Або початок поточного місяця:
            // const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            // fromDate = startOfMonth.toISOString();
            break;
        case 'all':
        default:
            fromDate = null; // Без обмеження по часу
            toDate = null;
            break;
    }
    console.log(`calculateTimeRange: timeframe=${timeframe}, from=${fromDate}, to=${toDate}`);
    return { fromDate, toDate };
}


// Функція завантаження даних для лідерборду
async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) {
        showError("Немає підключення до бази даних.");
        return null;
    }
    console.log(`Завантаження лідерборду: час=${timeframe}, складність=${difficulty}`);
    showLoading(); // Показати індикатор
    hideError();

    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe);

        let query = supabaseClient
            .from('scores')
            .select(`
                score,
                created_at,
                profiles ( username )
            `) // Отримуємо рахунок, дату та ім'я користувача з пов'язаної таблиці profiles
            .eq('difficulty', difficulty); // Фільтр за складністю

        // Додаємо фільтри часу
        if (fromDate) {
            query = query.gte('created_at', fromDate);
        }
         if (toDate) { // Тільки для 'today'
             query = query.lt('created_at', toDate);
         }

        // Сортування та обмеження
        query = query.order('score', { ascending: false }) // Спочатку найвищі бали
                   .order('created_at', { ascending: true }) // При однаковому рахунку - хто раніше досяг
                   .limit(10); // Показуємо ТОП-10

        const { data, error } = await query;

        if (error) {
            // Перевірка на помилку RLS для profiles
            if (error.message.includes('"profiles" violates row-level security policy')) {
                throw new Error("Не вдалося завантажити імена гравців. Перевірте політику SELECT для 'profiles'.");
            }
            // Перевірка на помилку RLS для scores
             if (error.message.includes('"scores" violates row-level security policy')) {
                 throw new Error("Не вдалося завантажити результати. Перевірте політику SELECT для 'scores'.");
             }
            throw error; // Інша помилка
        }

        console.log("Дані лідерборду отримано:", data);
        return data;

    } catch (error) {
        console.error("Помилка завантаження лідерборду:", error);
        showError(`Не вдалося завантажити лідерборд: ${error.message}`);
        return null;
    } finally {
        hideLoading(); // Сховати індикатор
    }
}

// Функція відображення даних лідерборду
function displayLeaderboard(data) {
    if (!leaderboardListElement) {
        console.error("Елемент списку лідерборду не знайдено!");
        return;
    }

    leaderboardListElement.innerHTML = ''; // Очистити попередній список

    if (!data || data.length === 0) {
        leaderboardListElement.innerHTML = '<li>Немає результатів для цього періоду/складності.</li>';
        return;
    }

    data.forEach((entry, index) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Анонім'; // Обробка випадку, якщо профіль не знайдено
        // const scoreDate = new Date(entry.created_at).toLocaleString('uk-UA'); // Можна додати дату
        li.textContent = `${index + 1}. ${username} - ${entry.score}`;
        leaderboardListElement.appendChild(li);
    });
}

// Оновлення активних кнопок фільтрів
function updateFilterButtonsUI() {
    // Час
    leaderboardTimeFilterButtons?.forEach(btn => {
        if (btn.dataset.timeframe === currentLeaderboardTimeframe) {
            btn.classList.add('active'); // Додати клас для активного стилю (треба визначити в CSS)
            btn.disabled = true; // Вимкнути активну кнопку
        } else {
            btn.classList.remove('active');
            btn.disabled = false;
        }
    });
    // Складність
    leaderboardDifficultyFilterButtons?.forEach(btn => {
        if (parseInt(btn.dataset.difficulty, 10) === currentLeaderboardDifficulty) {
            btn.classList.add('active');
            btn.disabled = true;
        } else {
            btn.classList.remove('active');
            btn.disabled = false;
        }
    });
}


// Головна функція для оновлення лідерборду
async function updateLeaderboard() {
    console.log(`Оновлення лідерборду: час=${currentLeaderboardTimeframe}, складність=${currentLeaderboardDifficulty}`);
    if (!leaderboardListElement) return; // Перевірка
    leaderboardListElement.innerHTML = '<li>Завантаження...</li>'; // Показати завантаження
    updateFilterButtonsUI(); // Оновити вигляд кнопок
    const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty);
    displayLeaderboard(data); // Відобразити отримані дані
}

// Обробники зміни фільтрів
function handleTimeFilterChange(event) {
    const newTimeframe = event.target.dataset.timeframe;
    if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) {
        currentLeaderboardTimeframe = newTimeframe;
        updateLeaderboard();
    }
}

function handleDifficultyFilterChange(event) {
    const newDifficulty = parseInt(event.target.dataset.difficulty, 10);
     if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) {
         currentLeaderboardDifficulty = newDifficulty;
         updateLeaderboard();
    }
}

// Функції відкриття/закриття лідерборду
function openLeaderboard() {
    console.log("Відкриття лідерборду...");
    hideError();
    // Сховати інші секції
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(userStatusElement) userStatusElement.style.display = 'none'; // Можна сховати і статус
    if(authSectionElement && !currentUser) authSectionElement.style.display = 'none'; // Ховаємо кнопку логіну, якщо не залогінений

    // Показати секцію лідерборду
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';

    // Завантажити дані для поточних фільтрів
    updateLeaderboard();
}

function closeLeaderboard() {
     console.log("Закриття лідерборду...");
     if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';

     // Показати відповідний стан UI залежно від логіну
     updateAuthStateUI(currentUser); // Ця функція покаже або кнопку логіну, або вибір складності
}


// ----- 11. Допоміжні функції -----
// (Без змін)
function showError(message) { /* ... */ }
function hideError() { /* ... */ }
function handleCriticalError(message) { /* ... */ }
function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) { console.error("Помилка ініціалізації DOM"); return; }
    setupAuthStateChangeListener(); // Спочатку налаштовуємо слухача
    updateAuthStateUI(currentUser); // Потім оновлюємо UI на основі currentUser (з checkInitialAuthState)
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    // Переконуємось, що все сховано на старті
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; // Ховаємо і лідерборд
}

// ----- Повний код решти функцій -----
// (Включаємо їх знову для повноти, без змін від попередньої версії)
async function checkAndCreateUserProfile(user) { if (!supabaseClient || !user) return; console.log(`Перевірка/створення профілю для користувача ${user.id}...`); try { const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle(); if (selectError && selectError.code !== 'PGRST116') throw selectError; if (!data) { console.log(`Профіль для ${user.id} не знайдено. Створення...`); const userEmail = user.email || `user_${user.id.substring(0, 8)}`; const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail; const profileDataToInsert = { id: user.id, username: potentialUsername, updated_at: new Date() }; console.log("Дані для вставки профілю:", profileDataToInsert); const { error: insertError } = await supabaseClient.from('profiles').insert(profileDataToInsert).select().single(); if (insertError) throw insertError; console.log(`Профіль для ${user.id} успішно створено.`); } else { console.log(`Профіль для ${user.id} вже існує.`); } } catch (error) { console.error("Загальна помилка під час перевірки/створення профілю:", error); showError(`Не вдалося перевірити/створити профіль: ${error.message}`); } }
function setupAuthStateChangeListener() { if (!supabaseClient) return; supabaseClient.auth.onAuthStateChange(async (_event, session) => { console.log(`Подія Auth State Change: ${_event}`, session); const user = session?.user ?? null; if (loginButton) { updateAuthStateUI(user); } else { console.warn("onAuthStateChange: DOM ще не готовий для оновлення UI"); currentUser = user; } if (_event === 'SIGNED_IN' && user) { await checkAndCreateUserProfile(user); } if (_event === 'SIGNED_OUT') { console.log("Користувач вийшов, скидання стану гри."); stopTimer(); selectedDifficulty = null; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; } }); }
async function checkInitialAuthState() { if (!supabaseClient) { return; }; console.log("Перевірка початкового стану автентифікації..."); try { const { data: { session }, error } = await supabaseClient.auth.getSession(); if (error) throw error; console.log("Початкова сесія:", session); currentUser = session?.user ?? null; } catch (error) { console.error("Помилка отримання початкової сесії:", error); currentUser = null; } }
function displayQuestion(questionData) { console.log("Виклик displayQuestion з даними:", questionData); if (!questionData) { console.error("displayQuestion: Немає даних."); return; } if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) { console.error("displayQuestion: DOM елементи не ініціалізовані!"); return; } currentQuestionData = questionData; hideError(); stickerImageElement.src = ""; stickerImageElement.alt = "Завантаження стікера..."; console.log("Встановлення src зображення:", questionData.imageUrl); stickerImageElement.src = questionData.imageUrl; stickerImageElement.onerror = () => { console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`); showError("Не вдалося завантажити зображення стікера."); stickerImageElement.alt = "Помилка завантаження зображення"; stickerImageElement.src = ""; setTimeout(endGame, 500); }; stickerImageElement.onload = () => { stickerImageElement.alt = "Стікер клубу"; }; optionsContainerElement.innerHTML = ''; console.log("Створення кнопок для варіантів:", questionData.options); if (questionData.options && Array.isArray(questionData.options)) { questionData.options.forEach((optionText, index) => { const button = document.createElement('button'); button.textContent = optionText; button.disabled = false; button.style.backgroundColor = ''; button.addEventListener('click', () => handleAnswer(optionText)); optionsContainerElement.appendChild(button); }); console.log("Цикл створення кнопок завершено."); } else { console.error("Помилка: questionData.options не є масивом або відсутній!"); showError("Помилка відображення варіантів відповіді."); return; } timeLeft = 10; if(timeLeftElement) timeLeftElement.textContent = timeLeft; if(currentScoreElement) currentScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'block'; if(resultAreaElement) resultAreaElement.style.display = 'none'; startTimer(); }
function handleAnswer(selectedOption) { stopTimer(); console.log(`Обрано відповідь: ${selectedOption}`); hideError(); if (!currentQuestionData || !optionsContainerElement) { return; } const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => button.disabled = true); if (selectedOption === currentQuestionData.correctAnswer) { console.log("Відповідь ПРАВИЛЬНА!"); currentScore++; if(currentScoreElement) currentScoreElement.textContent = currentScore; buttons.forEach(button => { if (button.textContent === selectedOption) button.style.backgroundColor = 'lightgreen'; }); setTimeout(loadNextQuestion, 700); } else { console.log("Відповідь НЕПРАВИЛЬНА!"); buttons.forEach(button => { if (button.textContent === currentQuestionData.correctAnswer) button.style.backgroundColor = 'lightgreen'; if (button.textContent === selectedOption) button.style.backgroundColor = 'salmon'; }); setTimeout(endGame, 1500); } }
function startTimer() { stopTimer(); timeLeft = 10; if(!timeLeftElement) { console.error("startTimer: timeLeftElement не знайдено!"); return; } timeLeftElement.textContent = timeLeft; console.log("Запуск інтервалу таймера (setInterval)..."); timerInterval = setInterval(() => { timeLeft--; if(timeLeftElement) { try { timeLeftElement.textContent = timeLeft.toString(); } catch(e) { console.error("Помилка оновлення тексту таймера:", e); stopTimer(); } } else { console.error("Timer tick: timeLeftElement не знайдено!"); stopTimer(); return; } if (timeLeft <= 0) { console.log("Час вийшов!"); stopTimer(); if (optionsContainerElement && currentQuestionData) { const buttons = optionsContainerElement.querySelectorAll('button'); buttons.forEach(button => { button.disabled = true; if (button.textContent === currentQuestionData.correctAnswer) { button.style.backgroundColor = 'lightyellow'; } }); } setTimeout(endGame, 1500); } }, 1000); console.log("setInterval викликано, timerInterval ID:", timerInterval); }
function stopTimer() { if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; } }
function showDifficultySelection() { console.log("Показ вибору складності"); hideError(); if (!gameAreaElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) { console.error("DOM не готовий..."); if (!initializeDOMElements()) return; } if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'block'; if(userStatusElement) userStatusElement.style.display = 'block'; }
function handleDifficultySelection(event) { const difficulty = parseInt(event.target.dataset.difficulty, 10); if (![1, 2, 3].includes(difficulty)) { return; } selectedDifficulty = difficulty; console.log(`Обрано складність: ${selectedDifficulty}`); if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; startGame(); }
async function startGame() { console.log(`Початок нової гри! Складність: ${selectedDifficulty}`); hideError(); if (selectedDifficulty === null) { console.error("Спроба почати гру без складності!"); showDifficultySelection(); return; } if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) { console.error("startGame: Не всі DOM елементи готові."); if (!initializeDOMElements()) { handleCriticalError("..."); return; } } currentScore = 0; if (currentScoreElement) currentScoreElement.textContent = 0; if (resultAreaElement) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(existingMsg) existingMsg.remove(); resultAreaElement.style.display = 'none'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if (gameAreaElement) gameAreaElement.style.display = 'block'; if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } if(userStatusElement) userStatusElement.style.display = 'none'; await loadNextQuestion(); }
async function loadNextQuestion() { console.log("loadNextQuestion: Виклик loadNewQuestion..."); const questionData = await loadNewQuestion(); if (questionData) { console.log("loadNextQuestion: Отримано дані, викликаємо displayQuestion..."); displayQuestion(questionData); } else { console.log("loadNextQuestion: Завантаження питання не вдалося, endGame має бути вже викликано."); } }
async function loadNewQuestion() { if (!supabaseClient || selectedDifficulty === null) { return null; } console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`); showLoading(); try { const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty); if (countError) throw countError; if (stickerCount === null || stickerCount === 0) { throw new Error(`Для обраної складності (${selectedDifficulty}) немає стікерів!`); } const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true }); if (totalClubCountError) throw totalClubCountError; if (totalClubCount === null || totalClubCount < 4) { throw new Error(`В базі недостатньо клубів (${totalClubCount})!`); } console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${stickerCount}`); const randomIndex = Math.floor(Math.random() * stickerCount); console.log(`Випадковий індекс: ${randomIndex}`); const { data: randomStickerData, error: stickerError } = await supabaseClient.from('stickers').select(`id, image_url, clubs ( id, name )`).eq('difficulty', selectedDifficulty).order('id', { ascending: true }).range(randomIndex, randomIndex).single(); if (stickerError) { throw new Error(`Помилка отримання даних стікера: ${stickerError.message}`); } if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Не вдалося отримати дані стікера/клубу."); } const stickerImageUrl = randomStickerData.image_url; const correctClubId = randomStickerData.clubs.id; const correctClubName = randomStickerData.clubs.name; console.log(`Вибраний стікер: URL=${stickerImageUrl}, ClubID=${correctClubId}, ClubName=${correctClubName}`); const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); if (incorrectClubsError) throw incorrectClubsError; if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів для варіантів."); const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3); if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 варіанти."); console.log(`Неправильні варіанти:`, incorrectOptions); const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()); console.log(`Всі варіанти (перемішані):`, allOptions); const questionDataForDisplay = { imageUrl: stickerImageUrl, options: allOptions, correctAnswer: correctClubName }; hideLoading(); return questionDataForDisplay; } catch (error) { console.error("Помилка під час завантаження запитання:", error); showError(`Помилка завантаження: ${error.message}`); hideLoading(); setTimeout(endGame, 500); return null; } }
function endGame() { console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`); stopTimer(); if(finalScoreElement) finalScoreElement.textContent = currentScore; if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(existingMsg) existingMsg.remove(); resultAreaElement.style.display = 'block'; } if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; if(userStatusElement) userStatusElement.style.display = 'block'; saveScore(); }
async function saveScore() { if (!currentUser) { return; } if (typeof currentScore !== 'number' || currentScore < 0) { return; } if (selectedDifficulty === null) { return; } if (currentScore === 0) { const scoreInfoMsg = document.createElement('p'); /* ... */ scoreInfoMsg.textContent = 'Результати зберігаються тільки якщо рахунок більше 0.'; /* ... */ const scoreParagraph = finalScoreElement?.parentNode; if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); } } return; } console.log(`Спроба збереження результату: ${currentScore}...`); showLoading(); let detectedCountryCode = null; console.log("ДЕБАГ: Перед викликом fetch до ip-api.com"); try { await fetch('https://ip-api.com/json/?fields=status,message,countryCode').then(response => { /* ... */ }).then(data => { /* ... */ }).catch(fetchError => { /* ... */ }); } catch (outerError) { /* ... */ } console.log("ДЕБАГ: Після блоку fetch. detectedCountryCode =", detectedCountryCode); try { console.log(`Зберігаємо в БД: ... country=${detectedCountryCode}`); const { error } = await supabaseClient.from('scores').insert({ user_id: currentUser.id, score: currentScore, difficulty: selectedDifficulty, country_code: detectedCountryCode }); if (error) { /* ... Обробка помилок insert ... */ throw error; } console.log("Результат успішно збережено!"); const scoreSavedMessage = document.createElement('p'); /* ... */ scoreSavedMessage.textContent = 'Ваш результат збережено!'; /* ... */ const scoreParagraph = finalScoreElement?.parentNode; /* ... */ if (resultAreaElement && scoreParagraph) { const existingMsg = resultAreaElement.querySelector('.save-message'); if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling); } } } catch (error) { console.error("Помилка збереження результату:", error); showError(`Не вдалося зберегти ваш результат: ${error.message}`); } finally { hideLoading(); } }
function showError(message) { console.error("Помилка гри:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Помилка: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Критична помилка:", message); document.body.innerHTML = `<h1>Помилка</h1><p>${message}</p><p>Будь ласка, оновіть сторінку.</p>`; }
function showLoading() { console.log("Показуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("Приховуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'none'; }
function initializeApp() { console.log("DOM завантажено, ініціалізація додатку..."); if (!initializeDOMElements()) { console.error("Критична помилка ініціалізації DOM"); return; } setupAuthStateChangeListener(); updateAuthStateUI(currentUser); console.log("Додаток ініціалізовано. Очікування дій користувача."); if(gameAreaElement) gameAreaElement.style.display = 'none'; if(resultAreaElement) resultAreaElement.style.display = 'none'; if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; }
