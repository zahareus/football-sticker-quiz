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

// ----- 4. DOM Елементи -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, loadingIndicator, errorMessageElement;

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

    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userEmailElement, logoutButton, loadingIndicator, errorMessageElement };
    for (const key in elements) {
        if (!elements[key]) {
             console.error(`Помилка: Не вдалося знайти DOM елемент з id '${key.replace('Element', '')}'!`);
             handleCriticalError("Помилка ініціалізації інтерфейсу гри.");
             return false;
        }
    }

    playAgainButton.addEventListener('click', startGame);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);

    console.log("DOM елементи успішно ініціалізовані.");
    return true;
}


// ----- 5. Функції Автентифікації -----
async function loginWithGoogle() {
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
    } catch (error) {
        console.error("Помилка виходу:", error);
        showError(`Помилка виходу: ${error.message}`);
    }
}

function updateAuthStateUI(user) {
   if (!loginButton || !userStatusElement || !userEmailElement) {
       console.warn("Елементи UI для автентифікації ще не готові для оновлення.");
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
        // Оновлюємо UI тільки якщо DOM вже ініціалізовано
         if (loginButton) { // Перевіряємо один з елементів
            updateAuthStateUI(user);
         } else {
            currentUser = user; // Зберігаємо користувача, UI оновиться пізніше
         }

        if (_event === 'SIGNED_IN' && user) {
           await checkAndCreateUserProfile(user);
        }
        if (_event === 'SIGNED_OUT') {
            console.log("Користувач вийшов, можливо скинути гру?");
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
         // UI оновиться в initializeApp після того, як елементи будуть готові
     } catch (error) {
         console.error("Помилка отримання початкової сесії:", error);
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

// ----- 9. Функції керування грою -----
async function startGame() {
    console.log("Початок нової гри!");
    hideError();

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
        // Очистити попереднє повідомлення про збереження
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
         resultAreaElement.style.display = 'none';
    }
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
        console.error("Не вдалося завантажити наступне запитання.");
        showError("Не вдалося завантажити наступне запитання. Можливо, проблеми з мережею або базою даних. Спробуйте зіграти ще раз.");
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block';
        if(finalScoreElement) finalScoreElement.textContent = currentScore;
    }
}

function endGame() {
     console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
     stopTimer();
     if(finalScoreElement) finalScoreElement.textContent = currentScore;
     if(gameAreaElement) gameAreaElement.style.display = 'none';
     if(resultAreaElement) {
         // Очистити попереднє повідомлення про збереження перед показом результату
        const existingMsg = resultAreaElement.querySelector('.save-message');
        if(existingMsg) existingMsg.remove();
        resultAreaElement.style.display = 'block';
     }
     saveScore(); // Викликаємо збереження результату ПІСЛЯ оновлення UI
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
     if (currentScore === 0) {
          console.log("Рахунок 0, результат не збережено.");
          return;
     }

     console.log(`Спроба збереження результату: ${currentScore} для користувача ${currentUser.id}`);
     showLoading();

     try {
         const { error } = await supabaseClient
             .from('scores')
             .insert({
                 user_id: currentUser.id,
                 score: currentScore
             });

         if (error) {
             if (error.code === '42501') { // RLS permission denied
                 throw new Error("Немає дозволу на збереження результату. Перевірте RLS політики для таблиці 'scores'.");
             } else if (error.code === '23503') { // foreign key violation
                 throw new Error("Помилка зв'язку з профілем користувача при збереженні результату.");
             }
             throw error;
         }
         console.log("Результат успішно збережено!");

         // Показуємо повідомлення про успішне збереження
         const scoreSavedMessage = document.createElement('p');
         scoreSavedMessage.textContent = 'Ваш результат збережено!';
         scoreSavedMessage.style.fontSize = 'small';
         scoreSavedMessage.style.marginTop = '5px';
         scoreSavedMessage.classList.add('save-message'); // Додаємо клас для можливого очищення

         // Додаємо повідомлення після <p> з рахунком
         const scoreParagraph = finalScoreElement.parentNode;
         if (resultAreaElement && scoreParagraph) {
             scoreParagraph.parentNode.insertBefore(scoreSavedMessage, scoreParagraph.nextSibling);
         }


     } catch (error) {
         console.error("Помилка збереження результату:", error);
         showError(`Не вдалося зберегти ваш результат: ${error.message}`);
     } finally {
         hideLoading();
     }
 }


// ----- 10. Допоміжні функції -----
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

// ----- 11. Обробник кнопки "Грати ще раз" ----- (у initializeDOMElements)

// ----- 12. Ініціалізація Додатку -----
function initializeApp() {
    console.log("DOM завантажено, ініціалізація додатку...");
    if (!initializeDOMElements()) {
        console.error("Помилка ініціалізації DOM елементів.");
        return;
    }
    setupAuthStateChangeListener();
    updateAuthStateUI(currentUser); // Оновити UI для початкового стану
    // startGame(); // Починаємо гру одразу (можна закоментувати, якщо гра має починатись після кліку)
    // Якщо гру не починати одразу, треба показати кнопку "Старт" або схоже
    if(gameAreaElement) gameAreaElement.style.display = 'none'; // Сховати гру спочатку
    if(resultAreaElement) resultAreaElement.style.display = 'none'; // Сховати результати спочатку
    // Можливо, додати кнопку "Почати гру", яка б викликала startGame()
}

// ----- 5. Функція для завантаження даних нового запитання -----
async function loadNewQuestion() {
    if (!supabaseClient) {
        console.error("Клієнт Supabase не ініціалізовано.");
        showError("Не вдалося підключитися до сервера гри.");
        return null;
    }
    console.log("Завантаження нового запитання...");
    showLoading();

    try {
        const { count, error: countError } = await supabaseClient
        .from('stickers')
        .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        if (count === null || count < 4) {
            throw new Error(`В базі даних недостатньо стікерів або клубів (знайдено ${count})! Потрібно більше для гри.`);
        }
        console.log(`Знайдено стікерів: ${count}`);
        const randomIndex = Math.floor(Math.random() * count);
        console.log(`Випадковий індекс: ${randomIndex}`);

        const { data: randomStickerData, error: stickerError } = await supabaseClient
        .from('stickers')
        .select(`id, image_url, clubs ( id, name )`)
        .range(randomIndex, randomIndex)
        .single();

        if (stickerError) throw stickerError;
        if (!randomStickerData || !randomStickerData.clubs) throw new Error("Не вдалося отримати дані випадкового стікера або пов'язаного клубу.");

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
        return null;
    }
}
