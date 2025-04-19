// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient; // Оголошуємо змінну тут, щоб вона була доступна глобально в скрипті

// Перевіряємо, чи завантажилась бібліотека Supabase
if (typeof supabase === 'undefined') {
  console.error('Помилка: Бібліотека Supabase не завантажилась. Перевір тег script в index.html.');
  // Можна показати повідомлення користувачу на сторінці
  // document.body.innerHTML = 'Помилка завантаження гри. Спробуйте оновити сторінку.';
} else {
  try {
     // Ініціалізуємо клієнт Supabase
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Клієнт Supabase успішно ініціалізовано');

    // --- Подальший код гри будемо додавати сюди ---

  } catch (error) {
    console.error('Помилка ініціалізації Supabase:', error);
    // Можна показати повідомлення користувачу
    // document.body.innerHTML = 'Помилка підключення до гри. Спробуйте оновити сторінку.';
  }
}
