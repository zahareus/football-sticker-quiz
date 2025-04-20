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
let selectedDifficulty = null; // Зберігаємо обрану складність тут

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons;

function initializeDOMElements() {
    // ... (без змін з попередньої версії) ...
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
async function loadNewQuestion() { /* ... */ } // Використовує selectedDifficulty
function endGame() {
    // (Без змін, але викликає оновлену saveScore)
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
     if(userStatusElement) userStatusElement.style.display = 'block';
     saveScore(); // <--- Викликаємо оновлену функцію
}

 // --- Функція збереження результату (ОНОВЛЕНО) ---
 async function saveScore() {
     if (!currentUser) {
         console.log("Користувач не залогінений. Результат не збережено.");
         return;
     }
     if (typeof currentScore !== 'number' || currentScore < 0) {
          console.log("Немає дійсного рахунку для збереження.");
          return;
     }
     // Перевіряємо, чи обрано складність
     if (selectedDifficulty === null) {
          console.error("Складність не була обрана (selectedDifficulty is null). Результат не збережено.");
          // Можна показати повідомлення користувачу, хоча це не мало б статися
          return;
     }

     if (currentScore === 0) {
          console.log("Рахунок 0, результат не збережено.");
          const scoreInfoMsg = document.createElement('p');
          scoreInfoMsg.textContent = 'Результати зберігаються тільки якщо рахунок більше 0.';
          scoreInfoMsg.style.fontSize = 'small';
          scoreInfoMsg.style.marginTop = '5px';
          scoreInfoMsg.classList.add('save-message');
          const scoreParagraph = finalScoreElement?.parentNode;
          if (resultAreaElement && scoreParagraph) {
             const existingMsg = resultAreaElement.querySelector('.save-message');
             if(!existingMsg) {
                scoreParagraph.parentNode.insertBefore(scoreInfoMsg, scoreParagraph.nextSibling);
             }
          }
          return;
     }

     console.log(`Спроба збереження результату: ${currentScore} (Складність: ${selectedDifficulty}) для користувача ${currentUser.id}`);
     showLoading();

     try {
         // Додаємо поле difficulty до об'єкту, що передається в insert
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore,
                 difficulty: selectedDifficulty // <--- ДОДАНО СКЛАДНІСТЬ
             });

         if (error) {
             if (error.code === '42501') { throw new Error("Немає дозволу на збереження результату. Перевірте RLS політики для таблиці 'scores'."); }
             else if (error.code === '23503') { throw new Error("Помилка зв'язку з профілем користувача при збереженні результату."); }
             // Обробка помилки, якщо тип difficulty невірний (малоймовірно, якщо ми передаємо 1, 2 або 3)
             else if (error.message.includes("invalid input value for enum")) { // Або інший текст помилки типу
                   throw new Error(`Помилка типу даних для складності: ${error.message}`);
             }
             else { throw error; }
         }
         console.log("Результат успішно збережено!");

         // Показуємо повідомлення про успішне збереження
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Ваш результат збережено!';
         scoreSavedMessage.style.fontSize = 'small';
         scoreSavedMessage.style.marginTop = '5px';
         scoreSavedMessage.classList.add('save-message');
         const scoreParagraph = finalScoreElement?.parentNode;
         if (resultAreaElement && scoreParagraph) {
            const existingMsg = resultAreaElement.querySelector('.save-message');
            if(!existingMsg) {
                scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling);
            }
         }

     } catch (error) {
         console.error("Помилка збереження результату:", error);
         showError(`Не вдалося зберегти ваш результат: ${error.message}`);
     } finally {
         hideLoading();
     }
 }


// ----- 10. Допоміжні функції -----
// (Без змін)
function showError(message) { /* ... */ }
function hideError() { /* ... */ }
function handleCriticalError(message) { /* ... */ }
function showLoading() { /* ... */ }
function hideLoading() { /* ... */ }

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)
// ----- 12. Ініціалізація Додатку -----
// (Без змін)
function initializeApp() { /* ... */ }

// ----- Повний код функцій, які були скорочені як /* ... */ -----
// (Включаємо їх знову для повноти, без змін від попередньої версії)

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
   if (!supabaseClient || !user) return;
   console.log(`Перевірка/створення профілю для користувача ${user.id}...`);
   try {
       const { data, error } = await supabaseClient
           .from('profiles')
           .select('id')
           .eq('id', user.id)
           .maybeSingle();

       if (error && error.code !== 'PGRST116') throw error;

       if (!data) {
           console.log(`Профіль для ${user.id} не знайдено. Створення...`);
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`;
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
           const { error: insertError } = await supabaseClient
               .from('profiles')
               .insert({ id: user.id, username: potentialUsername, updated_at: new Date() })
               .select().single();
           if (insertError) throw insertError;
           console.log(`Профіль для ${user.id} успішно створено.`);
       } else {
           console.log(`Профіль для ${user.id} вже існує.`);
       }
   } catch (error) {
       console.error("Помилка під час перевірки/створення профілю:", error);
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
            console.log("Користувач вийшов, можливо скинути гру?");
            stopTimer();
            if(gameAreaElement) gameAreaElement.style.display = 'none';
            if(resultAreaElement) resultAreaElement.style.display = 'none';
        }
    });
}

 async function checkInitialAuthState() {
     if (!supabaseClient) {
        console.log("checkInitialAuthState: Supabase client ще не готовий.");
        return;
     };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session);
         currentUser = session?.user ?? null;
     } catch (error) {
         console.error("Помилка отримання початкової сесії:", error);
     }
 }

function displayQuestion(questionData) {
    if (!questionData) {
        console.error("Немає даних для відображення запитання.");
        showError("Не вдалося відобразити запитання.");
        return;
    }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("DOM елементи не ініціалізовані перед displayQuestion!");
         return;
    }
    currentQuestionData = questionData;
    hideError();

    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
        stickerImageElement.src = "";
    };
    stickerImageElement.alt = "Стікер клубу";

    optionsContainerElement.innerHTML = '';
    questionData.options.forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        button.addEventListener('click', () => handleAnswer(optionText));
        optionsContainerElement.appendChild(button);
    });

    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;
    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    startTimer();
}

function handleAnswer(selectedOption) {
    stopTimer();
    console.log(`Обрано відповідь: ${selectedOption}`);
    hideError();

    if (!currentQuestionData) {
        console.error("Немає даних поточного запитання для перевірки відповіді!");
        return;
    }

    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        setTimeout(loadNextQuestion, 500);
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) {
                button.style.backgroundColor = 'lightgreen';
            }
             if (button.textContent === selectedOption) {
                 button.style.backgroundColor = 'salmon';
             }
        });
        setTimeout(endGame, 1500);
    }
}

function startTimer() {
     stopTimer();
    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        if(timeLeftElement) timeLeftElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer();
             if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        button.style.backgroundColor = 'lightgreen';
                     }
                 });
             }
            setTimeout(endGame, 1500);
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

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
     if (![1, 2, 3].includes(difficulty)) {
         console.error("Неправильне значення складності:", difficulty);
         showError("Обрано некоректну складність.");
         return;
     }
     selectedDifficulty = difficulty;
     console.log(`Обрано складність: ${selectedDifficulty}`);

     if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
     startGame();
}

async function startGame() {
    console.log(`Початок нової гри! Складність: ${selectedDifficulty}`);
    hideError();

    if (selectedDifficulty === null) {
        console.error("Спроба почати гру без обраної складності!");
        showError("Будь ласка, спочатку оберіть рівень складності.");
        showDifficultySelection();
        return;
    }

    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !difficultySelectionElement) {
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
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
     if (optionsContainerElement) {
         optionsContainerElement.innerHTML = '';
     }

    await loadNextQuestion();
}

async function loadNextQuestion() {
    const questionData = await loadNewQuestion();
    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("Не вдалося завантажити наступне запитання (з loadNextQuestion).");
         // endGame() буде викликано з loadNewQuestion у разі помилки
    }
}

 async function loadNewQuestion() {
  if (!supabaseClient) {
      console.error("Клієнт Supabase не ініціалізовано.");
      showError("Не вдалося підключитися до сервера гри.");
      return null;
  }
   if (selectedDifficulty === null) {
       console.error("Складність не обрано перед завантаженням запитання!");
       showError("Будь ласка, оберіть складність.");
       showDifficultySelection();
       return null;
   }

  console.log(`Завантаження нового запитання (Складність: ${selectedDifficulty})...`);
  showLoading();

  try {
    const { count, error: countError } = await supabaseClient
      .from('stickers')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', selectedDifficulty);

    if (countError) throw countError;
    if (count === null || count === 0) {
         throw new Error(`Для обраної складності (${selectedDifficulty}) немає стікерів у базі даних!`);
    }
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

    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`id, image_url, clubs ( id, name )`)
      .eq('difficulty', selectedDifficulty)
      .range(randomIndex, randomIndex)
      .single();

    if (stickerError) {
         console.error("Помилка отримання даних стікера:", stickerError);
         throw new Error(`Помилка отримання даних стікера: ${stickerError.message}`);
    }
    if (!randomStickerData || !randomStickerData.clubs) {
         console.error("Не отримано дані стікера або клубу:", randomStickerData);
         throw new Error("Не вдалося отримати дані випадкового стікера або пов'язаного клубу.");
    }

    const stickerImageUrl = randomStickerData.image_url;
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name;
    console.log(`Вибраний стікер: URL=<span class="math-inline">\{stickerImageUrl\}, ClubID\=</span>{correctClubId}, ClubName=${correctClubName}`);

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
    setTimeout(endGame, 500);
    return null;
  }
}


 function showError(message) {
    console.error("Помилка гри:", message);
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
    } else {
        alert(`Помилка: ${message}`);
    }
}

function hideError() {
      if (errorMessageElement) {
        errorMessageElement.style.display = 'none';
        errorMessageElement.textContent = '';
    }
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

 function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) {
        console.error("Критична помилка: Не вдалося ініціалізувати DOM елементи.");
        return;
    }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser);

    console.log("Додаток ініціалізовано. Очікування дій користувача (Вхід або Вибір складності).");
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
}
