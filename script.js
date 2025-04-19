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

    // Перевірка початкового стану автентифікації
    checkInitialAuthState(); // Перевіряємо стан до DOMContentLoaded

    // Переконуємось, що DOM готовий перед ініціалізацією елементів та запуском гри
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
let currentUser = null; // Зберігаємо інформацію про поточного користувача

// ----- 4. DOM Елементи -----
// Оголошуємо змінні тут, але отримуємо елементи ПІСЛЯ завантаження DOM
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, loadingIndicator, errorMessageElement;

// Ініціалізація DOM елементів (викликається після завантаження DOM)
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
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');


    // Перевірка, чи всі елементи знайдено
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, loadingIndicator, errorMessageElement };
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент з id '${key.replace('Element', '')}'!`);
             handleCriticalError("Помилка ініціалізації інтерфейсу гри.");
             return false; // Повернути ознаку помилки
        }
    }

    // Додаємо обробники подій до кнопок
    playAgainButton.addEventListener('click', startGame);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);

    console.log("DOM елементи успішно ініціалізовані.");
    return true; // Все гаразд
}


// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Клієнт Supabase не ініціалізовано.");
    console.log("Спроба входу через Google...");
    hideError(); // Сховати попередні помилки
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                 redirectTo: window.location.href // Явно вказуємо повертатися сюди ж
            }
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
        currentUser = null; // Очищуємо дані користувача
        updateAuthStateUI(null); // Оновлюємо UI негайно (хоча onAuthStateChange теж спрацює)
        // Можливо, потрібно скинути стан гри при виході
        // resetGame(); // Якщо є така функція
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Помилка виходу: ${error.message}`);
    }
}

// Функція для оновлення UI залежно від стану автентифікації
function updateAuthStateUI(user) {
   // Переконуємось, що елементи вже ініціалізовані
   if (!loginButton || !userStatusElement || !userEmailElement) {
       console.warn("Елементи UI для автентифікації ще не готові для оновлення.");
       // Якщо initializeDOMElements ще не викликалась, то ці елементи null
       // Вони будуть оновлені при першому виклику checkInitialAuthState після initializeApp
       return;
   }

   if (user) {
       currentUser = user;
       userEmailElement.textContent = user.email || 'невідомий email';
       userStatusElement.style.display = 'block';
       loginButton.style.display = 'none';
       console.log("UI оновлено: Користувач залогінений:", user.email);
   } else {
       currentUser = null;
       userStatusElement.style.display = 'none';
       loginButton.style.display = 'block';
       console.log("UI оновлено: Користувач не залогінений.");
   }
}

// Перевірка/Створення профілю користувача в базі даних
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
           const userEmail = user.email || `user_${user.id.substring(0, 8)}`; // Запасний варіант
           const potentialUsername = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;

           const { error: insertError } = await supabaseClient
               .from('profiles')
               .insert({
                   id: user.id,
                   username: potentialUsername,
                   updated_at: new Date()
               })
               .select() // Повертаємо створений запис (не обов'язково, але корисно для логування)
               .single(); // Очікуємо один запис

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

// Слухач змін стану автентифікації
function setupAuthStateChangeListener() {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        console.log(`Подія Auth State Change: ${_event}`, session);
        const user = session?.user ?? null;
        updateAuthStateUI(user); // Оновлюємо UI

        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }

        // Якщо користувач змінився, можливо, треба перезапустити гру або оновити дані
        // Наприклад, скинути гру при виході
        if (_event === 'SIGNED_OUT') {
            console.log("Користувач вийшов, можливо скинути гру?");
            // resetGame(); // Функція для скидання гри
        }
    });
}

 // Перевірка початкового стану (чи користувач вже залогінений?)
 async function checkInitialAuthState() {
     if (!supabaseClient) {
        console.log("checkInitialAuthState: Supabase client ще не готовий.");
        return;
     };
     console.log("Перевірка початкового стану автентифікації...");
     try {
         // getSession тепер основний метод замість getUser
         const { data: { session }, error } = await supabaseClient.auth.getSession();
         if (error) throw error;
         console.log("Початкова сесія:", session);
         currentUser = session?.user ?? null; // Оновлюємо глобальну змінну currentUser
         // Оновлюємо UI ПІСЛЯ ініціалізації DOM
         if (document.readyState !== 'loading') {
             updateAuthStateUI(currentUser);
         }
         // Не викликаємо checkAndCreateUserProfile тут, це зробить onAuthStateChange при потребі
     } catch (error) {
         console.error("Помилка отримання початкової сесії:", error);
         // Не показуємо помилку користувачу тут, бо це може бути нормальним станом (немає сесії)
     }
 }

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    if (!questionData) {
        console.error("Немає даних для відображення запитання.");
        showError("Не вдалося відобразити запитання.");
        return;
    }
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("DOM елементи не ініціалізовані перед displayQuestion!");
         return; // Якщо елементів немає, нічого не робити
    }

    currentQuestionData = questionData;
    hideError(); // Ховаємо попередні помилки

    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
        stickerImageElement.src = ""; // Очистити src, щоб не показувати зламану іконку
        // Можливо, варто завантажити інше запитання або завершити гру
        // loadNextQuestion(); // Спробувати наступне?
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
    timeLeftElement.textContent = timeLeft;
    currentScoreElement.textContent = currentScore;

    gameAreaElement.style.display = 'block';
    resultAreaElement.style.display = 'none';

    startTimer();
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    stopTimer();
    console.log(`Обрано відповідь: ${selectedOption}`);
    hideError();

    if (!currentQuestionData) {
        console.error("Немає даних поточного запитання для перевірки відповіді!");
        return;
    }

    // Блокуємо кнопки після відповіді (опціонально)
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);


    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        // Затримка перед наступним запитанням (опціонально)
        setTimeout(loadNextQuestion, 500); // Чекати пів секунди
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        // Показати правильну відповідь (опціонально)
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) {
                button.style.backgroundColor = 'lightgreen'; // Виділити правильну
            }
             if (button.textContent === selectedOption) {
                 button.style.backgroundColor = 'salmon'; // Виділити неправильну
             }
        });
        // Затримка перед екраном завершення (опціонально)
        setTimeout(endGame, 1500); // Чекати півтори секунди
    }
}

 // ----- 8. Функції таймера -----
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
            // Показати правильну відповідь (опціонально)
             if (optionsContainerElement && currentQuestionData) {
                 const buttons = optionsContainerElement.querySelectorAll('button');
                 buttons.forEach(button => {
                    button.disabled = true;
                     if (button.textContent === currentQuestionData.correctAnswer) {
                        button.style.backgroundColor = 'lightgreen';
                     }
                 });
             }
            setTimeout(endGame, 1500); // Затримка перед екраном кінця гри
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// ----- 9. Функції керування грою -----
async function startGame() {
    console.log("Початок нової гри!");
    hideError();

    // Перевірка DOM елементів
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement) {
         console.error("Необхідні DOM елементи не ініціалізовані. Неможливо почати гру.");
         // Спробувати ініціалізувати, якщо вони ще не готові
          if (!initializeDOMElements()) {
               handleCriticalError("Не вдалося ініціалізувати ігрові елементи.");
               return; // Не починати гру, якщо елементи не знайдено
          }
    }


    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;
    if (resultAreaElement) resultAreaElement.style.display = 'none';
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    // Очистити стилі кнопок, якщо вони були змінені
     if (optionsContainerElement) {
         optionsContainerElement.innerHTML = ''; // Очистити старі кнопки
     }


    await loadNextQuestion();
}

async function loadNextQuestion() {
    const questionData = await loadNewQuestion();
    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("Не вдалося завантажити наступне запитання.");
        // Замість виклику endGame тут, краще просто показати помилку,
        // бо endGame може викликатися і в інших випадках (неправильна відповідь, час вийшов)
        showError("Не вдалося завантажити наступне запитання. Можливо, проблеми з мережею або базою даних. Спробуйте зіграти ще раз.");
        // Можна показати кнопку "Грати ще раз" одразу
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block'; // Показати екран результату з 0
        if(finalScoreElement) finalScoreElement.textContent = currentScore; // Показати поточний (можливо 0) рахунок

    }
}

function endGame() {
     console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
     stopTimer();
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) resultAreaElement.style.display = 'block';
     saveScore(); // Викликати функцію збереження результату
}

 // --- Функція збереження результату ---
 async function saveScore() {
     if (!currentUser) {
         console.log("Користувач не залогінений. Результат не збережено.");
         return;
     }
     if (typeof currentScore !== 'number' || currentScore < 0) {
          console.log("Немає дійсного рахунку для збереження.");
          return;
     }
     // Не зберігаємо нульові результати (опціонально)
     if (currentScore === 0) {
          console.log("Рахунок 0, результат не збережено.");
          return;
     }


     console.log(`Спроба збереження результату: ${currentScore} для користувача ${currentUser.id}`);
     showLoading(); // Показати завантаження

     try {
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore
             });

         if (error) {
             // Можливі помилки: RLS політика не дозволяє insert, проблеми з мережею
             if (error.code === '42501') { // permission denied for table scores
                 throw new Error("Немає дозволу на збереження результату. Перевірте RLS політики для таблиці 'scores'.");
             }
             throw error;
         }
         console.log("Результат успішно збережено!");
         // Можна показати повідомлення користувачу (не через alert, можливо)
         // Наприклад, додати текст під рахунком на екрані результатів
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Ваш результат збережено!';
         scoreSavedMessage.style.fontSize = 'small';
         if (resultAreaElement) resultAreaElement.appendChild(scoreSavedMessage);


     } catch (error) {
         console.error("Помилка збереження результату:", error);
         showError(`Не вдалося зберегти ваш результат: ${error.message}`);
     } finally {
         hideLoading(); // Сховати завантаження
     }
 }

// ----- 10. Допоміжні функції -----
function showError(message) {
    console.error("Помилка гри:", message);
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block'; // Показати елемент з помилкою
    } else {
        alert(`Помилка: ${message}`); // Запасний варіант
    }
}

function hideError() {
     if (errorMessageElement) {
        errorMessageElement.style.display = 'none'; // Сховати елемент з помилкою
        errorMessageElement.textContent = '';
    }
}

// Функція для критичних помилок, що зупиняють роботу
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


// ----- 11. Обробник кнопки "Грати ще раз" -----
// (Тепер додається в initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) {
        console.error("Помилка ініціалізації DOM елементів.");
        return;
    }
    // Слухач подій Auth налаштовується тут, щоб мати доступ до DOM елементів
    setupAuthStateChangeListener();
    // Оновлюємо UI для початкового стану автентифікації
    updateAuthStateUI(currentUser); // Використовуємо currentUser, який міг бути встановлений checkInitialAuthState

    // Запускаємо гру (або можна чекати на дії користувача)
    // startGame(); // Вирішили починати гру одразу
}
