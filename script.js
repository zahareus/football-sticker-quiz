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
    // Ініціалізуємо додаток після завантаження DOM
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
let selectedDifficulty = null; // Починаємо без обраної складності

// ----- 4. DOM Елементи -----
// Оголошуємо тут, знаходимо в initializeDOMElements
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;

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

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент '${key.replace('Element', '')}'!`);
             allFound = false;
        }
    }
    if (!difficultyButtons || difficultyButtons.length !== 3) { // Має бути рівно 3 кнопки
         console.error("Помилка: Не вдалося знайти всі 3 кнопки вибору складності!");
         allFound = false;
    }

    if (!allFound) {
        console.error("initializeDOMElements: Не всі елементи знайдено.");
        return false; // Повертаємо false, якщо щось не знайдено
    }

    // Додаємо обробники подій
    console.log("initializeDOMElements: Додавання слухачів подій...");
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
    hideError();
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href } // Повертатися на поточну сторінку
        });
        if (error) throw error;
        console.log("Перенаправлення на Google..."); // Лог перед перенаправленням
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
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userEmailElement) {
       console.warn("updateAuthStateUI: DOM елементи ще не ініціалізовані!");
       return; // Вийти, якщо елементи не готові
   }
   console.log("updateAuthStateUI: DOM елементи готові.");

   if (user) {
       // Користувач залогінений
       currentUser = user;
       console.log("updateAuthStateUI: Користувач є.");
       userEmailElement.textContent = user.email || 'невідомий email';
       userStatusElement.style.display = 'block'; // Показати статус
       loginButton.style.display = 'none';     // Сховати кнопку входу
       // Показуємо вибір складності, якщо гра/результати не відображаються
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none') {
            showDifficultySelection();
       } else {
           // Якщо гра або результати видимі, вибір складності не показуємо
           if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
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
           console.error("updateAuthStateUI: loginButton null/undefined!");
       }
       if (userStatusElement) userStatusElement.style.display = 'none';
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       // Зупиняємо та ховаємо гру/результати
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}

// Перевірка/Створення профілю користувача (версія без країни)
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`checkAndCreateUserProfile: Перевірка/створення профілю для ${user.id}...`);
   try {
       const { data, error: selectError } = await supabaseClient.from('profiles').select('id').eq('id', user.id).maybeSingle();
       if (selectError && selectError.code !== 'PGRST116') throw selectError; // Ігноруємо тільки "не знайдено"
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
    if (!supabaseClient) {
        console.error("setupAuthStateChangeListener: supabaseClient не ініціалізовано!");
        return;
    }
    console.log("Налаштування слухача onAuthStateChange...");
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Подія Auth State Change: ${_event}`, session ? `Session User ID: ${session.user?.id}` : 'No session');
        const user = session?.user ?? null;
        // Оновлюємо UI тільки якщо DOM готовий
         if (loginButton) { // Використовуємо loginButton як індикатор готовності DOM
            updateAuthStateUI(user);
         } else {
             console.warn("onAuthStateChange: DOM ще не готовий, оновлення UI відкладено.");
             // Зберігаємо останній стан користувача, він буде використаний в initializeApp
             currentUser = user;
         }
        // Перевірка/створення профілю тільки при вході
        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        // Скидання гри при виході
        if (_event === 'SIGNED_OUT') {
            console.log("SIGNED_OUT: Скидання стану гри.");
            stopTimer();
            selectedDifficulty = null;
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
            if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
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
         currentUser = null;
     }
 }

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    console.log("Виклик displayQuestion з даними:", questionData);
    if (!questionData) { console.error("displayQuestion: Немає даних."); return; }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("displayQuestion: DOM елементи не ініціалізовані!"); return;
    }
    currentQuestionData = questionData; // Зберігаємо поточні дані запитання
    hideError();

    stickerImageElement.src = ""; // Спочатку очистити, щоб не було миготіння старої картинки
    stickerImageElement.alt = "Завантаження стікера...";
    console.log("Встановлення src зображення:", questionData.imageUrl);
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
        stickerImageElement.src = "";
        setTimeout(endGame, 500); // Завершити гру, якщо картинка не завантажилась
    };
    stickerImageElement.onload = () => { stickerImageElement.alt = "Стікер клубу"; };

    optionsContainerElement.innerHTML = ''; // Очищаємо кнопки
    console.log("Створення кнопок для варіантів:", questionData.options);
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText, index) => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.disabled = false; // Кнопки мають бути активні
            button.style.backgroundColor = ''; // Скидання стилю
            button.addEventListener('click', () => handleAnswer(optionText));
            optionsContainerElement.appendChild(button);
        });
        console.log("Цикл створення кнопок завершено.");
    } else {
        console.error("Помилка: questionData.options не є масивом або відсутній!");
        showError("Помилка відображення варіантів відповіді.");
        setTimeout(endGame, 500); // Завершити гру, якщо немає варіантів
        return;
    }

    timeLeft = 10; // Скидаємо таймер
    if(timeLeftElement) timeLeftElement.textContent = timeLeft; // Оновлюємо відображення таймера
    if(currentScoreElement) currentScoreElement.textContent = currentScore; // Показуємо поточний рахунок

    if(gameAreaElement) gameAreaElement.style.display = 'block'; // Показуємо ігрову зону
    if(resultAreaElement) resultAreaElement.style.display = 'none'; // Ховаємо результати

    startTimer(); // Запускаємо таймер для нового запитання
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer(); // Зупиняємо таймер одразу при відповіді
    console.log(`Обрано відповідь: ${selectedOption}`);
    hideError();
    if (!currentQuestionData || !optionsContainerElement) { console.error("handleAnswer: Немає даних питання або контейнера опцій"); return; }

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true); // Вимикаємо всі кнопки

    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++; // Збільшуємо рахунок
        if(currentScoreElement) currentScoreElement.textContent = currentScore; // Оновлюємо відображення рахунку
        // Виділяємо правильну відповідь зеленим
        buttons.forEach(button => { if (button.textContent === selectedOption) button.style.backgroundColor = 'lightgreen'; });
        setTimeout(loadNextQuestion, 700); // Завантажуємо наступне питання з невеликою затримкою
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        // Виділяємо правильну (зеленим) і неправильну (червоним) відповіді
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) button.style.backgroundColor = 'lightgreen';
            if (button.textContent === selectedOption) button.style.backgroundColor = 'salmon';
        });
        setTimeout(endGame, 1500); // Завершуємо гру з більшою затримкою
    }
}

 // ----- 8. Функції таймера -----
function startTimer() {
    stopTimer(); // Завжди зупиняємо попередній таймер
    timeLeft = 10; // Скидаємо час
    if(!timeLeftElement) { console.error("startTimer: timeLeftElement не знайдено!"); return; }
    timeLeftElement.textContent = timeLeft; // Встановлюємо початкове значення

    console.log("Запуск інтервалу таймера (setInterval)...");
    timerInterval = setInterval(() => {
        timeLeft--;
        // console.log(`Timer Tick: timeLeft=${timeLeft}`); // Розкоментуй для детальної відладки таймера
        if(timeLeftElement) {
            try { timeLeftElement.textContent = timeLeft.toString(); } // Оновлюємо текст
            catch(e) { console.error("Помилка оновлення тексту таймера:", e); stopTimer(); }
        } else { console.error("Timer tick: timeLeftElement не знайдено!"); stopTimer(); return; }

        // Перевірка, чи час вийшов
        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer(); // Зупиняємо таймер
            // Вимикаємо кнопки та показуємо правильну відповідь
             if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        button.style.backgroundColor = 'lightyellow'; // Показуємо правильну
                     }
                 });
             }
            setTimeout(endGame, 1500); // Завершуємо гру із затримкою
        }
    }, 1000); // Інтервал 1 секунда
    console.log("setInterval викликано, timerInterval ID:", timerInterval);
}

function stopTimer() {
    if (timerInterval !== null) {
        // console.log("Зупинка таймера ID:", timerInterval);
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
           // Спробувати знайти елементи ще раз, якщо їх немає
           if (!initializeDOMElements()) {
                handleCriticalError("Критична помилка: не вдалося знайти DOM елементи для вибору складності.");
                return;
           }
      }
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
     if(userStatusElement) userStatusElement.style.display = 'block'; // Статус користувача теж видимий
}

function handleDifficultySelection(event) {
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) { return; } // Ігнорувати некоректні значення
     selectedDifficulty = difficulty;
     console.log(`Обрано складність: ${selectedDifficulty}`);
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Сховати вибір
     startGame(); // Почати гру
}

async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();
    if (selectedDifficulty === null) { console.error("Спроба почати гру без складності!"); showDifficultySelection(); return; }
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement || !userStatusElement) {
        console.error("startGame: Не всі DOM елементи готові.");
        if (!initializeDOMElements()) { handleCriticalError("Не вдалося ініціалізувати елементи для старту гри."); return; }
    }
    currentScore = 0; // Скидаємо рахунок
    if (currentScoreElement) currentScoreElement.textContent = 0; // Оновлюємо UI
    if (resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove(); // Прибираємо старі повідомлення про збереження
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
        displayQuestion(questionData); // <--- КЛЮЧОВИЙ ВИКЛИК
    } else {
        // ПОМИЛКА: endGame вже має бути викликано з loadNewQuestion
        console.log("loadNextQuestion: Завантаження питання не вдалося, endGame мав бути викликаний.");
    }
}


// Функція завантаження даних запитання (ВИПРАВЛЕНО)
 async function loadNewQuestion() {
  if (!supabaseClient || selectedDifficulty === null) {
      console.error("loadNewQuestion: Клієнт не готовий або складність не обрано.");
      showError("Помилка завантаження запитання."); // Показуємо користувачу
      return null; // Повертаємо null, щоб loadNextQuestion знав про помилку
  }
  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
  showLoading();
  try {
    // Запит кількості стікерів
    const { count: stickerCount, error: countError } = await supabaseClient.from('stickers').select('*', { count: 'exact', head: true }).eq('difficulty', selectedDifficulty);
    if (countError) throw countError;
    if (stickerCount === null || stickerCount === 0) { throw new Error(`Для складності ${selectedDifficulty} немає стікерів!`); }

    // Запит кількості клубів
    const { count: totalClubCount, error: totalClubCountError } = await supabaseClient.from('clubs').select('id', { count: 'exact', head: true });
    if (totalClubCountError) throw totalClubCountError;
    if (totalClubCount === null || totalClubCount < 4) { throw new Error(`В базі недостатньо клубів (${totalClubCount})!`); }

    console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${stickerCount}`);
    const randomIndex = Math.floor(Math.random() * stickerCount);
    console.log(`Випадковий індекс: ${randomIndex}`);

    // Запит випадкового стікера з сортуванням
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`id, image_url, clubs ( id, name )`) // Запит імені клубу разом зі стікером
      .eq('difficulty', selectedDifficulty)
      .order('id', { ascending: true }) // Сортування
      .range(randomIndex, randomIndex)
      .single(); // Очікуємо один результат

    if (stickerError) { throw new Error(`Помилка отримання даних стікера: ${stickerError.message}`); }
    if (!randomStickerData || !randomStickerData.clubs) { throw new Error("Не вдалося отримати дані стікера/клубу."); }

    // Запит неправильних варіантів
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient.from('clubs').select('name').neq('id', correctClubId).limit(50); // Беремо з запасом
    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів для генерації варіантів.");

    // Формування варіантів
    const incorrectOptions = incorrectClubsData.map(club => club.name).filter(name => name !== correctClubName).sort(() => 0.5 - Math.random()).slice(0, 3);
    if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 унікальних варіанти.");

    const questionDataForDisplay = {
        imageUrl: randomStickerData.image_url,
        options: [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random()),
        correctAnswer: correctClubName
    };
    console.log("Дані для запитання успішно завантажено.");
    hideLoading();
    return questionDataForDisplay; // Повертаємо готові дані

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    showError(`Помилка завантаження: ${error.message}`);
    hideLoading();
    setTimeout(endGame, 500); // Завершуємо гру при помилці
    return null; // Повертаємо null, щоб loadNextQuestion знав про помилку
  }
}

// Функція завершення гри
function endGame() {
     console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
     stopTimer(); // Зупиняємо таймер
     // Показуємо результати
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none'; // Ховаємо гру
     if(resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message'); // Прибираємо старе повідомлення про збереження
        if(existingMsg) existingMsg.remove();
        resultAreaElement.style.display = 'block'; // Показуємо результати
     }
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Ховаємо вибір складності
     if(userStatusElement) userStatusElement.style.display = 'block'; // Показуємо статус користувача (щоб бачити кнопку "Обрати складність")
     saveScore(); // Зберігаємо результат
}

 // Функція збереження результату (з країною та дебагом GeoIP)
 async function saveScore() {
     if (!currentUser) { console.log("saveScore: Користувач не залогінений."); return; }
     if (typeof currentScore !== 'number' || currentScore < 0) { console.log("saveScore: Немає дійсного рахунку."); return; }
     if (selectedDifficulty === null) { console.error("saveScore: Складність не обрана."); return; }
     // Не зберігаємо нульові результати
     if (currentScore === 0) {
          console.log("saveScore: Рахунок 0, результат не збережено.");
          const scoreInfoMsg = document.createElement('p');
          scoreInfoMsg.textContent = 'Результати зберігаються тільки якщо рахунок більше 0.';
          scoreInfoMsg.style.fontSize = 'small';
          scoreInfoMsg.style.marginTop = '5px';
          scoreInfoMsg.classList.add('save-message');
          const scoreParagraph = finalScoreElement?.parentNode;
          if (resultAreaElement && scoreParagraph) {
             const existingMsg = resultAreaElement.querySelector('.save-message');
             if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling); }
          }
          return;
     }

     console.log(`Спроба збереження результату: ${currentScore} (Складність: ${selectedDifficulty}) для користувача ${currentUser.id}`);
     showLoading();
     let detectedCountryCode = null; // Починаємо з null

     // --- ПОЧАТОК ДЕБАГУ GeoIP ---
     console.log("ДЕБАГ: Перед викликом fetch до ip-api.com");
     try {
         await fetch('https://ip-api.com/json/?fields=status,message,countryCode')
             .then(response => {
                 console.log("ДЕБАГ: Fetch відповідь отримана (status):", response.status, response.statusText);
                 if (!response.ok) {
                     console.error("ДЕБАГ: Fetch відповідь НЕ ok:", response.statusText);
                     return response.text().then(text => { console.error("ДЕБАГ: Тіло відповіді з помилкою:", text); throw new Error(`GeoIP Error: ${response.statusText}`); });
                 }
                 console.log("ДЕБАГ: Намагаємось отримати JSON з відповіді...");
                 return response.json();
             })
             .then(data => {
                 console.log("ДЕБАГ: Отримано JSON дані:", data);
                 if (data && data.status === 'success' && data.countryCode) {
                     detectedCountryCode = String(data.countryCode).substring(0, 2).toUpperCase(); // Беремо тільки 2 літери коду країни
                     console.log(`ДЕБАГ: Країну визначено як ${detectedCountryCode}`);
                 } else { console.warn("ДЕБАГ: Не вдалося визначити країну з даних:", data); }
             })
             .catch(fetchError => { console.error("ДЕБАГ: Помилка всередині .catch() для fetch/json:", fetchError); });
     } catch (outerError) { console.error("ДЕБАГ: Неочікувана помилка навколо fetch:", outerError); }
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
            else { throw error; }
         }
         console.log("Результат успішно збережено!");
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Ваш результат збережено!';
         scoreSavedMessage.style.fontSize = 'small';
         scoreSavedMessage.style.marginTop = '5px';
         scoreSavedMessage.classList.add('save-message');
         const scoreParagraph = finalScoreElement?.parentNode;
         if (resultAreaElement && scoreParagraph) {
             const existingMsg = resultAreaElement.querySelector('.save-message');
             if(!existingMsg) { scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling); }
         }
     } catch (error) {
         console.error("Помилка збереження результату:", error);
         showError(`Не вдалося зберегти ваш результат: ${error.message}`);
     } finally {
         hideLoading();
     }
 }


// ----- 10. Допоміжні функції -----
function showError(message) { console.error("Помилка гри:", message); if (errorMessageElement) { errorMessageElement.textContent = message; errorMessageElement.style.display = 'block'; } else { alert(`Помилка: ${message}`); } }
function hideError() { if (errorMessageElement) { errorMessageElement.style.display = 'none'; errorMessageElement.textContent = ''; } }
function handleCriticalError(message) { console.error("Критична помилка:", message); document.body.innerHTML = `<h1>Помилка</h1><p>${message}</p><p>Будь ласка, оновіть сторінку.</p>`; }
function showLoading() { console.log("Показуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'block'; }
function hideLoading() { console.log("Приховуємо індикатор завантаження..."); if (loadingIndicator) loadingIndicator.style.display = 'none'; }

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) { console.error("Критична помилка ініціалізації DOM"); return; }
    setupAuthStateChangeListener(); // Спочатку налаштовуємо слухача
    // Оновлюємо UI на основі currentUser, отриманого з checkInitialAuthState,
    // ЦЕЙ ВИКЛИК ДУЖЕ ВАЖЛИВИЙ для початкового стану UI
    updateAuthStateUI(currentUser);
    console.log("Додаток ініціалізовано. Очікування дій користувача.");
    // Ховаємо все зайве на старті
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
}
