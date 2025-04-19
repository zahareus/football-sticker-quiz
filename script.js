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
    // Переконуємось, що DOM готовий перед стартом гри
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startGame);
    } else {
        startGame(); // DOM вже готовий
    }
  } catch (error) {
    console.error('Помилка ініціалізації Supabase:', error);
    document.body.innerHTML = 'Помилка підключення до гри. Спробуйте оновити сторінку.';
    supabaseClient = null;
  }
}

// ----- 3. Глобальні змінні для стану гри -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;

// ----- 4. DOM Елементи -----
// Оголошуємо змінні тут, але отримуємо елементи ПІСЛЯ завантаження DOM
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton;

function initializeDOMElements() {
    gameAreaElement = document.getElementById('game-area');
    stickerImageElement = document.getElementById('sticker-image');
    optionsContainerElement = document.getElementById('options');
    timeLeftElement = document.getElementById('time-left');
    currentScoreElement = document.getElementById('current-score');
    resultAreaElement = document.getElementById('result-area');
    finalScoreElement = document.getElementById('final-score');
    playAgainButton = document.getElementById('play-again');

    // Перевірка, чи всі елементи знайдено
    if (!gameAreaElement || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !resultAreaElement || !finalScoreElement || !playAgainButton) {
        console.error("Помилка: Не вдалося знайти один або більше DOM елементів!");
        showError("Помилка інтерфейсу гри. Не вдалося знайти необхідні елементи.");
        return false; // Повернути ознаку помилки
    }

    // Додаємо обробник події до кнопки "Грати ще раз" тут, після того як елемент знайдено
    playAgainButton.addEventListener('click', startGame);
    return true; // Все гаразд
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
    console.log(`Вибраний стікер: URL=${stickerImageUrl}, ClubID=${correctClubId}, ClubName=${correctClubName}`);

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

// ----- 6. Функція для відображення запитання на сторінці -----
function displayQuestion(questionData) {
    if (!questionData) {
        console.error("Немає даних для відображення запитання.");
        showError("Не вдалося відобразити запитання.");
        return;
    }
    // Перевірка, чи елементи DOM ініціалізовані
    if (!stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
         console.error("DOM елементи ще не ініціалізовані перед displayQuestion!");
         if (!initializeDOMElements()) return; // Спробувати ініціалізувати, якщо не вдалося - вийти
    }


    currentQuestionData = questionData;

    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Помилка завантаження зображення: ${questionData.imageUrl}`);
        showError("Не вдалося завантажити зображення стікера.");
        stickerImageElement.alt = "Помилка завантаження зображення";
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

    if (!currentQuestionData) {
        console.error("Немає даних поточного запитання для перевірки відповіді!");
        return; // Немає чого перевіряти
    }

    if (selectedOption === currentQuestionData.correctAnswer) {
        console.log("Відповідь ПРАВИЛЬНА!");
        currentScore++;
        if(currentScoreElement) currentScoreElement.textContent = currentScore;
        loadNextQuestion(); // Завантажуємо наступне запитання
    } else {
        console.log("Відповідь НЕПРАВИЛЬНА!");
        endGame(); // Кінець гри
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
            endGame();
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

    // Ініціалізуємо DOM елементи тут, якщо ще не зроблено
    if (!initializeDOMElements()) {
       console.error("Не вдалося ініціалізувати DOM елементи. Гра не може початися.");
       return;
    }


    currentScore = 0; // Скидаємо рахунок (глобальна змінна)

    // Оновлюємо відображення рахунку НАПРЯМУ значенням 0
    // Додана перевірка, чи елемент існує
    if (currentScoreElement) {
         currentScoreElement.textContent = 0; // ВИПРАВЛЕНО: Використовуємо 0 напряму
    } else {
        console.error("Елемент currentScoreElement не знайдено при старті гри!");
    }

    if (resultAreaElement) resultAreaElement.style.display = 'none'; // Ховаємо результати
    if (gameAreaElement) gameAreaElement.style.display = 'block'; // Показуємо гру

    await loadNextQuestion(); // Завантажуємо перше запитання
}

async function loadNextQuestion() {
    const questionData = await loadNewQuestion();
    if (questionData) {
        displayQuestion(questionData);
    } else {
        console.error("Не вдалося завантажити наступне запитання.");
        showError("Не вдалося завантажити наступне запитання. Спробуйте зіграти ще раз.");
        endGame();
    }
}

function endGame() {
    console.log(`Гра завершена! Фінальний рахунок: ${currentScore}`);
    stopTimer();
    if(finalScoreElement) finalScoreElement.textContent = currentScore;
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'block';
    // TODO: Додати логіку збереження результату
}

// ----- 10. Допоміжні функції -----
function showError(message) {
    console.error("Помилка гри:", message);
    alert(`Помилка: ${message}`); // Показати користувачу
}

function showLoading() {
  console.log("Показуємо індикатор завантаження...");
  // TODO: Додати реальний індикатор завантаження
}

function hideLoading() {
   console.log("Приховуємо індикатор завантаження...");
   // TODO: Приховати реальний індикатор завантаження
}


// ----- 11. Обробник кнопки "Грати ще раз" -----
// Обробник тепер додається в initializeDOMElements()

// ----- 12. Ініціалізація гри (викликається після ініціалізації Supabase) -----
// startGame() тепер викликається з перевіркою DOMContentLoaded
