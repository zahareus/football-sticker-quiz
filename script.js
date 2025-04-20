// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
// (Без змін)
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
let selectedDifficulty = null; // Змінна для зберігання обраної складності

// ----- 4. DOM Елементи -----
// Додаємо difficultySelectionElement
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
// Додаємо колекцію кнопок складності
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
    difficultySelectionElement = document.getElementById('difficulty-selection'); // Новий елемент
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');

    // Знаходимо всі кнопки складності
    difficultyButtons = document.querySelectorAll('.difficulty-button');

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент з id '${key.replace('Element', '')}'!`);
             allFound = false;
        }
    }
    // Перевіряємо, чи знайдено кнопки складності
    if (!difficultyButtons || difficultyButtons.length === 0) {
         console.error("Помилка: Не вдалося знайти кнопки вибору складності!");
         allFound = false;
    }


    if (!allFound) {
        handleCriticalError("Помилка ініціалізації інтерфейсу гри.");
        return false;
    }

    // Додаємо обробники подій
    playAgainButton.addEventListener('click', showDifficultySelection); // Змінено дію кнопки
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    // Додаємо обробники для кнопок складності
    difficultyButtons.forEach(button => {
        button.addEventListener('click', handleDifficultySelection);
    });


    console.log("DOM елементи успішно ініціалізовані та слухачі додані.");
    return true;
}


// ----- 5. Функції Автентифікації -----
// (Залишаються без змін)
async function loginWithGoogle() { /* ... */ }
async function logout() { /* ... */ }
async function checkAndCreateUserProfile(user) { /* ... */ }
function setupAuthStateChangeListener() { /* ... */ }
async function checkInitialAuthState() { /* ... */ }

// Функція для оновлення UI залежно від стану автентифікації
 function updateAuthStateUI(user) {
   if (!loginButton || !userStatusElement || !difficultySelectionElement) {
       console.warn("Auth UI: DOM елементи ще не готові.");
       return;
   }

   if (user) {
       currentUser = user;
       if(userEmailElement) userEmailElement.textContent = user.email || 'невідомий email';
       userStatusElement.style.display = 'block';      // Показати статус
       loginButton.style.display = 'none';           // Сховати кнопку входу
       showDifficultySelection(); // Показати вибір складності замість авто-старту
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       currentUser = null;
       userStatusElement.style.display = 'none';       // Сховати статус
       loginButton.style.display = 'block';        // Показати кнопку входу
       difficultySelectionElement.style.display = 'none'; // Сховати вибір складності
       // Сховати гру та результати, якщо користувач виходить
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    // (Код без змін)
    // ...
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    // (Код без змін)
    // ...
}

 // ----- 8. Функції таймера -----
function startTimer() {
    // (Код без змін)
    // ...
}

function stopTimer() {
    // (Код без змін)
    // ...
}

// ----- 9. Функції керування грою -----

// Нова функція для показу вибору складності
function showDifficultySelection() {
     console.log("Показ вибору складності");
     hideError();
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'none';
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
     // Переконатись, що статус користувача видимий
     if(userStatusElement) userStatusElement.style.display = 'block';
}

// Обробник вибору складності
function handleDifficultySelection(event) {
     // Визначаємо рівень складності з data-атрибуту кнопки
     const difficulty = parseInt(event.target.dataset.difficulty, 10);
     if (![1, 2, 3].includes(difficulty)) {
         console.error("Неправильне значення складності:", difficulty);
         showError("Обрано некоректну складність.");
         return;
     }
     selectedDifficulty = difficulty; // Зберігаємо обрану складність глобально
     console.log(`Обрано складність: ${selectedDifficulty}`);

     // Ховаємо вибір складності і починаємо гру
     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     startGame(); // Тепер startGame використовує selectedDifficulty
}


// Функція старту гри (тепер без параметрів, використовує глобальний selectedDifficulty)
async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();

    if (selectedDifficulty === null) {
        console.error("Спроба почати гру без обраної складності!");
        showError("Будь ласка, спочатку оберіть рівень складності.");
        showDifficultySelection(); // Показати вибір знову
        return;
    }

    if (!gameAreaElement || !currentScoreElement || !resultAreaElement) {
         console.error("Необхідні DOM елементи не ініціалізовані.");
          if (!initializeDOMElements()) {
               handleCriticalError("Не вдалося ініціалізувати ігрові елементи.");
               return;
          }
    }

    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;
    if (resultAreaElement) {
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
         resultAreaElement.style.display = 'none';
    }
    // Статус користувача вже має бути видимим, але ховаємо вибір складності
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
     if (optionsContainerElement) {
         optionsContainerElement.innerHTML = '';
     }

    await loadNextQuestion(); // Завантажуємо перше запитання (використає selectedDifficulty)
}

async function loadNextQuestion() {
    // Викликаємо loadNewQuestion, яка тепер використовує глобальний selectedDifficulty
    const questionData = await loadNewQuestion();
    if (questionData) {
        displayQuestion(questionData);
    } else {
        // Помилка завантаження вже обробляється в loadNewQuestion
        console.error("Не вдалося завантажити наступне запитання (з loadNextQuestion).");
        // Можливо, показати екран результатів з поточним рахунком
         endGame(); // Завершити гру, якщо завантаження не вдалося
    }
}

// Функція завантаження запитання (тепер використовує selectedDifficulty)
 async function loadNewQuestion() {
  if (!supabaseClient) {
      console.error("Клієнт Supabase не ініціалізовано.");
      showError("Не вдалося підключитися до сервера гри.");
      return null;
  }
  // Перевіряємо, чи обрано складність
   if (selectedDifficulty === null) {
       console.error("Складність не обрано перед завантаженням запитання!");
       showError("Будь ласка, оберіть складність.");
       showDifficultySelection(); // Показати вибір
       return null;
   }

  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
  showLoading();

  try {
    // 1. Отримати кількість стікерів ДЛЯ ОБРАНОЇ СКЛАДНОСТІ
    const { count, error: countError } = await supabaseClient
      .from('stickers')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', selectedDifficulty); // <--- ФІЛЬТР ЗА СКЛАДНІСТЮ

    if (countError) throw countError;
    // Перевіряємо, чи є стікери саме для цієї складності
    if (count === null || count === 0) {
         throw new Error(`Для обраної складності (${selectedDifficulty}) немає стікерів у базі даних!`);
    }
    // Перевіряємо, чи достатньо клубів загалом (хоча б 4 для варіантів)
     const { count: totalClubCount, error: totalClubCountError } = await supabaseClient
         .from('clubs')
         .select('id', { count: 'exact', head: true });
      if (totalClubCountError) throw totalClubCountError;
      if (totalClubCount === null || totalClubCount < 4) {
            throw new Error(`В базі даних недостатньо клубів (${totalClubCount}) для генерації варіантів відповіді!`);
      }


    console.log(`Знайдено стікерів для складності ${selectedDifficulty}: ${count}`);
    const randomIndex = Math.floor(Math.random() * count);
    console.log(`Випадковий індекс: ${randomIndex}`);

    // 3. Отримати один випадковий стікер ЗА ОБРАНОЮ СКЛАДНІСТЮ
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`id, image_url, clubs ( id, name )`)
      .eq('difficulty', selectedDifficulty) // <--- ФІЛЬТР ЗА СКЛАДНІСТЮ
      .range(randomIndex, randomIndex)
      .single();

    if (stickerError) throw stickerError;
    if (!randomStickerData || !randomStickerData.clubs) throw new Error("Не вдалося отримати дані випадкового стікера або пов'язаного клубу.");

    const stickerImageUrl = randomStickerData.image_url;
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    console.log(`Вибраний стікер: URL=<span class="math-inline">\{stickerImageUrl\}, ClubID\=</span>{correctClubId}, ClubName=${correctClubName}`);

    // 4. Отримати 3 неправильні назви клубів
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient
      .from('clubs')
      .select('name')
      .neq('id', correctClubId)
      .limit(50);

    if (incorrectClubsError) throw incorrectClubsError;
    if (!incorrectClubsData || incorrectClubsData.length < 3) throw new Error("Недостатньо клубів у базі для генерації 3 неправильних варіантів.");

    const incorrectOptions = incorrectClubsData
      .map(club => club.name)
      .filter(name => name !== correctClubName)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

     if (incorrectOptions.length < 3) throw new Error("Не вдалося вибрати 3 унікальних неправильних варіанти.");
    console.log(`Неправильні варіанти:`, incorrectOptions);

    const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
    console.log(`Всі варіанти (перемішані):`, allOptions);

    hideLoading();

    return {
      imageUrl: stickerImageUrl,
      options: allOptions,
      correctAnswer: correctClubName
    };

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    showError(`Помилка завантаження: ${error.message}`);
    hideLoading();
    return null;
  }
}


function endGame() {
    // (Код без змін)
    // ...
}

 // --- Функція збереження результату ---
 async function saveScore() {
    // (Код без змін)
    // ...
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
    if (!initializeDOMElements()) {
        console.error("Критична помилка: Не вдалося ініціалізувати DOM елементи.");
        return;
    }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser); // Оновити UI для початкового стану

    // НЕ ЗАПУСКАЄМО startGame() АВТОМАТИЧНО
    console.log("Додаток ініціалізовано. Очікування дій користувача (Вхід або Вибір складності).");
    // Сховати все зайве спочатку
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Ховаємо і складність спочатку
}
