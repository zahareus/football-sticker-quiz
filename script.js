const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUserProfile = null;
let selectedDifficulty = null;

const userNicknameElement = document.getElementById('user-nickname');
const editNicknameButton = document.getElementById('edit-nickname-button');
const logoutButton = document.getElementById('logout-button');
const editNicknameForm = document.getElementById('edit-nickname-form');
const nicknameInputElement = document.getElementById('nickname-input');
const cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

const difficultyButtons = document.querySelectorAll('.difficulty-button');
const showLeaderboardButton = document.getElementById('show-leaderboard-button');

const gameArea = document.getElementById('game-area');
const stickerImage = document.getElementById('sticker-image');
const optionsContainer = document.getElementById('options');
const timeLeftElement = document.getElementById('time-left');
const scoreElement = document.getElementById('current-score');

const resultArea = document.getElementById('result-area');
const finalScoreElement = document.getElementById('final-score');
const playAgainButton = document.getElementById('play-again');
const showLeaderboardLink = document.getElementById('show-leaderboard-link');

const leaderboardSection = document.getElementById('leaderboard-section');
const leaderboardList = document.getElementById('leaderboard-list');
const closeLeaderboardButton = document.getElementById('close-leaderboard-button');

const loadingIndicator = document.getElementById('loading-indicator');
const errorMessageElement = document.getElementById('error-message');

function showError(msg) {
  if (errorMessageElement) {
    errorMessageElement.style.display = 'block';
    errorMessageElement.textContent = msg;
  }
}

function hideError() {
  if (errorMessageElement) {
    errorMessageElement.style.display = 'none';
    errorMessageElement.textContent = '';
  }
}

function showLoading() {
  if (loadingIndicator) loadingIndicator.style.display = 'block';
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// ------------------------ Auth -----------------------

supabaseClient.auth.onAuthStateChange(async (_, session) => {
  const user = session?.user;
  currentUser = user;
  if (user) {
    await checkAndCreateUserProfile(user);
    updateUIOnLogin();
  } else {
    updateUIOnLogout();
  }
});

async function checkInitialAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (user) {
    currentUser = user;
    await checkAndCreateUserProfile(user);
    updateUIOnLogin();
  }
}

function updateUIOnLogin() {
  if (!currentUserProfile) return;
  userNicknameElement.textContent = currentUserProfile.username || 'User';
}

function updateUIOnLogout() {
  location.reload(); // simplest reset
}

async function checkAndCreateUserProfile(user) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const username = "Player" + Math.floor(Math.random() * 1000);
      const { data: created } = await supabaseClient
        .from('profiles')
        .insert({ id: user.id, username })
        .select()
        .single();
      currentUserProfile = created;
    } else {
      currentUserProfile = data;
    }
  } catch (err) {
    console.error(err);
  }
}

logoutButton.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  updateUIOnLogout();
});

editNicknameButton.addEventListener('click', () => {
  nicknameInputElement.value = currentUserProfile.username;
  editNicknameForm.style.display = 'block';
});

cancelEditNicknameButton.addEventListener('click', () => {
  editNicknameForm.style.display = 'none';
});

editNicknameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newName = nicknameInputElement.value.trim();
  if (!newName || newName.length < 3) return;

  const { data, error } = await supabaseClient
    .from('profiles')
    .update({ username: newName })
    .eq('id', currentUser.id)
    .select()
    .single();

  if (!error) {
    currentUserProfile = data;
    userNicknameElement.textContent = data.username;
    editNicknameForm.style.display = 'none';
  }
});

// ------------------------ Game -----------------------

let timer = null;
let time = 10;
let score = 0;
let currentQuestion = null;

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDifficulty = parseInt(btn.dataset.difficulty, 10);
    startGame();
  });
});

function startGame() {
  score = 0;
  updateScore();
  time = 10;
  updateTimerDisplay();
  document.getElementById('difficulty-selection').style.display = 'none';
  gameArea.style.display = 'block';
  resultArea.style.display = 'none';
  loadNextQuestion();
}

function updateTimerDisplay() {
  timeLeftElement.textContent = time;
}

function updateScore() {
  scoreElement.textContent = score;
}

function startTimer() {
  time = 10;
  updateTimerDisplay();
  timer = setInterval(() => {
    time--;
    updateTimerDisplay();
    if (time <= 0) {
      clearInterval(timer);
      endGame();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
}

async function loadNextQuestion() {
  showLoading();
  optionsContainer.innerHTML = '';
  stickerImage.src = '';
  try {
    const { data, error } = await supabaseClient
      .rpc('get_random_question', { difficulty_level: selectedDifficulty });

    if (error || !data) throw error;
    currentQuestion = data;
    stickerImage.src = data.image_url;
    const options = shuffle([data.correct_answer, ...data.incorrect_answers]);
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = () => handleAnswer(opt);
      optionsContainer.appendChild(btn);
    });
    hideLoading();
    startTimer();
  } catch (err) {
    console.error(err);
    showError("Could not load question");
    hideLoading();
  }
}

function handleAnswer(answer) {
  stopTimer();
  const correct = answer === currentQuestion.correct_answer;
  [...optionsContainer.children].forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === currentQuestion.correct_answer)
      btn.classList.add('correct-answer');
    if (btn.textContent === answer && !correct)
      btn.classList.add('incorrect-answer');
  });

  if (correct) {
    score++;
    updateScore();
    setTimeout(loadNextQuestion, 1000);
  } else {
    setTimeout(endGame, 1500);
  }
}

function endGame() {
  stopTimer();
  finalScoreElement.textContent = score;
  gameArea.style.display = 'none';
  resultArea.style.display = 'block';
}

// ------------------------ Leaderboard -----------------------

document.getElementById('show-leaderboard-link').onclick = showLeaderboard;
showLeaderboardButton.onclick = showLeaderboard;
closeLeaderboardButton.onclick = () => leaderboardSection.style.display = 'none';

function showLeaderboard() {
  leaderboardSection.style.display = 'block';
  resultArea.style.display = 'none';
  fetchLeaderboard();
}

async function fetchLeaderboard() {
  leaderboardList.innerHTML = '<li>Loading...</li>';
  const { data, error } = await supabaseClient
    .from('scores')
    .select('score, created_at, profiles(username)')
    .eq('difficulty', selectedDifficulty)
    .order('score', { ascending: false })
    .limit(10);

  if (error) return showError("Failed to load leaderboard");

  leaderboardList.innerHTML = '';
  data.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.profiles.username}: ${entry.score}`;
    leaderboardList.appendChild(li);
  });
}

playAgainButton.onclick = () => {
  resultArea.style.display = 'none';
  document.getElementById('difficulty-selection').style.display = 'block';
};

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

checkInitialAuth();
