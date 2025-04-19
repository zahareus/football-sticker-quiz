// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Ініціалізація клієнта Supabase -----
if (typeof supabase === 'undefined') {
  console.error('Помилка: Бібліотека Supabase не завантажилась.');
  document.body.innerHTML = 'Помилка завантаження гри. Спробуйте оновити сторінку.';
} else {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Клієнт Supabase успішно ініціалізовано');
    // --- Починаємо гру після успішної ініціалізації ---
    startGame(); // Запускаємо гру замість тестового виклику
  } catch (error) {
    console.error('Помилка ініціалізації Supabase:', error);
    document.body.innerHTML = 'Помилка підключення до гри. Спробуйте оновити сторінку.';
    supabaseClient = null;
  }
}

// ----- 3. Глобальні змінні для стану гри -----
let currentQuestionData = null; // Тут буде зберігатись об'єкт з поточним запитанням
let currentScore = 0;
let timeLeft = 10; // Початковий час на відповідь
let timerInterval = null; // Змінна для зберігання інтервалу таймера

// ----- 4. DOM Елементи -----
// Отримуємо посилання на елементи HTML один раз при завантаженні скрипта
const gameAreaElement = document.getElementById('game-area');
const stickerImageElement = document.getElementById('sticker-image');
const optionsContainerElement = document.getElementById('options');
const timeLeftElement = document.getElementById('time-left');
const currentScoreElement = document.getElementById('current-score');
const resultAreaElement = document.getElementById('result-area');
const finalScoreElement = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again');

// ----- 5. Функція для завантаження даних нового запитання -----
async function loadNewQuestion() {
  if (!supabaseClient) {
      console.error("Клієнт Supabase не ініціалізовано.");
      // Можливо, показати помилку користувачу
      showError("Не вдалося підключитися до сервера гри.");
      return null;
  }

  console.log("Завантаження нового запитання...");
  showLoading(); // Показати індикатор завантаження (якщо є)

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

    hideLoading(); // Сховати індикатор завантаження

    return {
      imageUrl: stickerImageUrl,
      options: allOptions,
      correctAnswer: correctClubName
    };

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    showError(`Помилка завантаження: ${error.message}`); // Показати помилку користувачу
    hideLoading();
    return null;
  }
}

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    if (!questionData) {
        console.error("Немає даних для відображення запитання.");
        showError("Не вдалося відобразити запитання.");
        return;
    }

    currentQuestionData = questionData; // Зберігаємо дані поточного запитання

    // Оновлюємо зображення стікера
    stickerImageElement.src = questionData.imageUrl;
    // Додамо обробник помилки завантаження зображення (опціонально)
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
    };
    stickerImageElement.alt = "Стікер клубу"; // Скидаємо alt текст

    // Очищуємо попередні варіанти відповідей
    optionsContainerElement.innerHTML = '';

    // Створюємо та додаємо нові кнопки з варіантами
    questionData.options.forEach(optionText => {
        const button = document.createElement('button');
        button.textContent = optionText;
        // Додаємо обробник події 'click' для кожної кнопки
        button.addEventListener('click', () => handleAnswer(optionText));
        optionsContainerElement.appendChild(button);
    });

    // Скидаємо та оновлюємо таймер і рахунок (візуально)
    timeLeft = 10; // Повертаємо час до початкового значення
    timeLeftElement.textContent = timeLeft;
    currentScoreElement.textContent = currentScore; // Показуємо поточний рахунок

    // Показуємо ігрову зону, ховаємо результати
    gameAreaElement.style.display = 'block';
    resultAreaElement.style.display = 'none';

    // Запускаємо таймер для цього запитання
    startTimer();
}

// ----- 7. Функція обробки відповіді користувача -----
function handleAnswer(selectedOption) {
    // Зупиняємо таймер негайно
    stopTimer();

    console.log(`Обрано відповідь: ${selectedOption}`);

    // Перевіряємо, чи відповідь правильна
    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++; // Збільшуємо рахунок
        currentScoreElement.textContent = currentScore; // Оновлюємо відображення рахунку
        // Завантажуємо наступне запитання
        loadNextQuestion();
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        // Кінець гри
        endGame();
    }
}

 // ----- 8. Функції таймера -----
function startTimer() {
    stopTimer(); // Зупиняємо попередній таймер, якщо він був
    timeLeft = 10; // Скидаємо час
    timeLeftElement.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timeLeftElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            console.log("Час вийшов!");
            stopTimer();
            endGame(); // Кінець гри, якщо час вийшов
        }
    }, 1000); // Оновлюємо кожну секунду (1000 мілісекунд)
}

function stopTimer() {
    clearInterval(timerInterval); // Зупиняємо інтервал
    timerInterval = null;
}

// ----- 9. Функції керування грою -----
async function startGame() {
    console.log("Початок нової гри!");
    currentScore = 0; // Скидаємо рахунок
    currentScoreElement.textContent = currentScore;
    resultAreaElement.style.display = 'none'; // Ховаємо результати
    gameAreaElement.style.display = 'block'; // Показуємо гру
    loadNextQuestion(); // Завантажуємо перше запитання
}

async function loadNextQuestion() {
    const questionData = await loadNewQuestion();
    if (questionData) {
        displayQuestion(questionData);
    } else {
        // Якщо завантажити запитання не вдалося, можливо, завершити гру або показати помилку
        console.error("Не вдалося завантажити наступне запитання.");
        showError("Не вдалося завантажити наступне запитання. Спробуйте зіграти ще раз.");
        endGame(); // Завершуємо гру при помилці завантаження
    }
}

function endGame() {
    console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
    stopTimer(); // Зупиняємо таймер на всякий випадок
    finalScoreElement.textContent = currentScore; // Показуємо фінальний рахунок
    gameAreaElement.style.display = 'none'; // Ховаємо ігрову зону
    resultAreaElement.style.display = 'block'; // Показуємо результати
    // TODO: Додати логіку збереження результату в Supabase (якщо користувач залогінений)
}

// ----- 10. Допоміжні функції -----
function showError(message) {
    // Простий спосіб показати помилку. Можна зробити краще.
    console.error("Помилка гри:", message);
    alert(`Помилка: ${message}`);
}

function showLoading() {
  // Можна додати логіку для показу спіннера або напису "Завантаження..."
  console.log("Показуємо індикатор завантаження...");
  // Наприклад: document.getElementById('loading-indicator').style.display = 'block';
}

function hideLoading() {
  // Можна додати логіку для приховування спіннера
   console.log("Приховуємо індикатор завантаження...");
  // Наприклад: document.getElementById('loading-indicator').style.display = 'none';
}


// ----- 11. Обробник кнопки "Грати ще раз" -----
// Додаємо обробник події до кнопки "Грати ще раз"
if(playAgainButton) {
    playAgainButton.addEventListener('click', startGame);
} else {
    console.warn("Кнопку 'Грати ще раз' не знайдено!");
}

// ----- 12. Ініціалізація гри (викликається після ініціалізації Supabase) -----
// startGame() викликається вище, всередині блоку try...catch ініціалізації Supabase
