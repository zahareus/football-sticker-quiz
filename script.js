// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient; // Оголошуємо змінну тут, щоб вона була доступна глобально

// ----- 2. Ініціалізація клієнта Supabase -----
// Перевіряємо, чи завантажилась бібліотека Supabase (з index.html)
if (typeof supabase === 'undefined') {
  console.error('Помилка: Бібліотека Supabase не завантажилась. Перевір тег script в index.html.');
  // Можна показати повідомлення користувачу на сторінці, якщо виникне така помилка
  document.body.innerHTML = 'Помилка завантаження гри. Спробуйте оновити сторінку.';
} else {
  try {
    // Ініціалізуємо клієнт Supabase
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Клієнт Supabase успішно ініціалізовано');

    // --- Тестовий виклик функції завантаження запитання ---
    // (цей код виконається один раз при завантаженні скрипта)
    loadNewQuestion().then(questionData => {
      if (questionData) {
        console.log("------ Дані для першого запитання отримано: ------");
        console.log("URL стікера:", questionData.imageUrl);
        console.log("Варіанти відповідей:", questionData.options);
        console.log("Правильна відповідь:", questionData.correctAnswer);
        console.log("--------------------------------------------------");
      } else {
        console.log("Не вдалося завантажити дані для першого запитання.");
      }
    });

  } catch (error) {
    console.error('Помилка ініціалізації Supabase:', error);
    // Можна показати повідомлення користувачу
    document.body.innerHTML = 'Помилка підключення до гри. Спробуйте оновити сторінку.';
    supabaseClient = null; // Встановлюємо в null, щоб інші частини коду не намагались використати неініціалізований клієнт
  }
}


// ----- 3. Функція для завантаження даних нового запитання -----
async function loadNewQuestion() {
  // Перевіряємо, чи клієнт Supabase готовий до роботи
  if (!supabaseClient) {
      console.error("Клієнт Supabase не ініціалізовано.");
      return null;
  }

  console.log("Завантаження нового запитання...");
  try {
    // 1. Отримати загальну кількість стікерів
    const { count, error: countError } = await supabaseClient
      .from('stickers')
      .select('*', { count: 'exact', head: true }); // head:true - не завантажувати дані, тільки кількість

    if (countError) throw countError;
    if (count === null || count < 4) { // Потрібно хоча б 4 клуби для 4 варіантів
         throw new Error(`В базі даних недостатньо стікерів або клубів (знайдено ${count})! Потрібно більше для гри.`);
    }

    console.log(`Знайдено стікерів: ${count}`);

    // 2. Вибрати випадковий індекс
    const randomIndex = Math.floor(Math.random() * count);
    console.log(`Випадковий індекс: ${randomIndex}`);

    // 3. Отримати один випадковий стікер за індексом
    // Важливо: Додаємо .select() для отримання даних клубу одразу!
    const { data: randomStickerData, error: stickerError } = await supabaseClient
      .from('stickers')
      .select(`
          id,
          image_url,
          clubs ( id, name )
      `) // Отримуємо id, image_url зі stickers ТА id, name з пов'язаної таблиці clubs
      .range(randomIndex, randomIndex)
      .single(); // Очікуємо тільки один результат

    if (stickerError) {
        console.error("Помилка отримання стікера:", stickerError);
        throw stickerError;
    }
    if (!randomStickerData || !randomStickerData.clubs) {
        console.error("Не вдалося отримати дані стікера або клубу:", randomStickerData);
        throw new Error("Не вдалося отримати дані випадкового стікера або пов'язаного клубу.");
    }

    const stickerImageUrl = randomStickerData.image_url;
    const correctClubId = randomStickerData.clubs.id;
    const correctClubName = randomStickerData.clubs.name; // Назву клубу беремо одразу тут

    console.log(`Вибраний стікер: URL=${stickerImageUrl}, ClubID=${correctClubId}, ClubName=${correctClubName}`);

    // 4. Отримати 3 неправильні назви клубів (Крок з отриманням правильної назви окремо вже не потрібен)
    const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient
      .from('clubs')
      .select('name')
      .neq('id', correctClubId) // Виключаємо правильний клуб
      .limit(50); // Беремо більше з запасом, щоб точно вистачило унікальних

    if (incorrectClubsError) throw incorrectClubsError;

    // Перевіряємо, чи достатньо варіантів
     if (!incorrectClubsData || incorrectClubsData.length < 3) {
         console.warn("Недостатньо інших клубів для генерації 3 неправильних варіантів.");
         // Можна додати заповнювачі або кинути помилку, якщо це критично
         throw new Error("Недостатньо клубів у базі для генерації 3 неправильних варіантів.");
     }

    // Вибираємо 3 унікальні випадкові назви з отриманих
    const incorrectOptions = incorrectClubsData
      .map(club => club.name) // Беремо тільки назви
      .filter(name => name !== correctClubName) // Додаткова перевірка на унікальність (про всяк випадок)
      .sort(() => 0.5 - Math.random()) // Перемішуємо масив
      .slice(0, 3); // Беремо перші 3 після перемішування

     // Перевіряємо, чи справді отримали 3 варіанти
     if (incorrectOptions.length < 3) {
         console.error("Помилка: не вдалося вибрати 3 унікальних неправильних варіанти!", incorrectOptions);
         throw new Error("Не вдалося вибрати 3 унікальних неправильних варіанти.");
     }

    console.log(`Неправильні варіанти:`, incorrectOptions);

    // 5. Формуємо масив з 4 варіантів (правильний + 3 неправильних) і перемішуємо їх
    const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());
    console.log(`Всі варіанти (перемішані):`, allOptions);

    // 6. Повертаємо об'єкт з даними для запитання
    return {
      imageUrl: stickerImageUrl,
      options: allOptions,
      correctAnswer: correctClubName
    };

  } catch (error) {
    console.error("Помилка під час завантаження запитання:", error);
    // Повідомити користувача про помилку
    // alert("Не вдалося завантажити нове запитання. Спробуйте оновити сторінку.");
    return null; // Повертаємо null, щоб позначити помилку
  }
}

// ----- 4. Інші функції та логіка гри (будуть додані пізніше) -----
// Наприклад:
// - функція для відображення запитання на сторінці
// - функція для обробки відповіді користувача
// - функція для таймера
// - функції для початку та завершення гри
// - функції для автентифікації
// - функції для лідерборду
