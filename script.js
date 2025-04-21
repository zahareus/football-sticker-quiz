const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Усі змінні, DOM та логіка — як у стабільній версії:
let currentUser = null;
let currentUserProfile = null;
let currentScore = 0;
let selectedDifficulty = null;
let timerInterval;
let timeLeft = 10;
let currentQuestionData = null;

// DOM elements
const userNickname = document.getElementById('user-nickname');
const logoutButton = document.getElementById('logout-button');
const editNicknameBtn = document.getElementById('edit-nickname-button');
const nicknameForm = document.getElementById('edit-nickname-form');
const nicknameInput = document.getElementById('nickname-input');
const cancelEdit = document.getElementById('cancel-edit-nickname-button');

const difficultySection = document.getElementById('difficulty-selection');
const gameArea = document.getElementById('game-area');
const resultArea = document.getElementById('result-area');
const finalScoreElem = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again');

const timeElem = document.getElementById('time-left');
const scoreElem = document.getElementById('current-score');
const stickerImage = document.getElementById('sticker-image');
const optionsContainer = document.getElementById('options');

const showLeaderboardBtn = document.getElementById('show-leaderboard-button');
const leaderboardSection = document.getElementById('leaderboard-section');
const leaderboardList = document.getElementById('leaderboard-list');
const closeLeaderboardButton = document.getElementById('close-leaderboard-button');

// INIT
init();
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  updateUI();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateUI();
  });
}

function updateUI() {
  if (currentUser) {
    loadUserProfile();
  } else {
    location.reload();
  }
}

async function loadUserProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (data) {
    currentUserProfile = data;
    userNickname.textContent = data.username;
  } else {
    const nickname = "Player " + Math.floor(Math.random() * 1000);
    await supabase.from("profiles").insert({ id: currentUser.id, username: nickname });
    currentUserProfile = { username: nickname };
    userNickname.textContent = nickname;
  }
}

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

editNicknameBtn.addEventListener("click", () => {
  nicknameForm.style.display = "inline";
  nicknameInput.value = currentUserProfile.username;
  userNickname.style.display = "none";
  editNicknameBtn.style.display = "none";
});

cancelEdit.addEventListener("click", () => {
  nicknameForm.style.display = "none";
  userNickname.style.display = "inline";
  editNicknameBtn.style.display = "inline";
});

nicknameForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newName = nicknameInput.value.trim();
  if (newName.length > 2 && newName.length <= 25) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: newName })
      .eq("id", currentUser.id);
    if (!error) {
      userNickname.textContent = newName;
      nicknameForm.style.display = "none";
      userNickname.style.display = "inline";
      editNicknameBtn.style.display = "inline";
    }
  }
});

// DIFFICULTY
document.querySelectorAll('.difficulty-button').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDifficulty = parseInt(btn.dataset.difficulty, 10);
    difficultySection.style.display = "none";
    startGame();
  });
});

function startGame() {
  currentScore = 0;
  scoreElem.textContent = "0";
  gameArea.style.display = "block";
  resultArea.style.display = "none";
  loadNextQuestion();
}

function loadNextQuestion() {
  stopTimer();
  stickerImage.src = "";
  optionsContainer.innerHTML = "";
  loadQuestion();
}

async function loadQuestion() {
  const { count, error: countError } = await supabase
    .from("stickers")
    .select("*", { count: "exact", head: true })
    .eq("difficulty", selectedDifficulty);

  if (countError || count === 0) return;

  const randomIndex = Math.floor(Math.random() * count);
  const { data, error } = await supabase
    .from("stickers")
    .select("image_url, clubs(name)")
    .eq("difficulty", selectedDifficulty)
    .order("id", { ascending: true })
    .range(randomIndex, randomIndex)
    .single();

  if (!data || error) return;

  const correct = data.clubs.name;
  const { data: clubs } = await supabase
    .from("clubs")
    .select("name")
    .neq("name", correct);

  const incorrect = clubs.map(c => c.name).sort(() => 0.5 - Math.random()).slice(0, 3);
  const options = [correct, ...incorrect].sort(() => 0.5 - Math.random());

  currentQuestionData = { image: data.image_url, correct };
  displayQuestion(options);
}

function displayQuestion(options) {
  stickerImage.src = currentQuestionData.image;
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.onclick = () => handleAnswer(option);
    optionsContainer.appendChild(btn);
  });
  timeLeft = 10;
  timeElem.textContent = timeLeft;
  startTimer();
}

function handleAnswer(answer) {
  stopTimer();
  const buttons = optionsContainer.querySelectorAll("button");
  buttons.forEach(b => b.disabled = true);
  if (answer === currentQuestionData.correct) {
    currentScore++;
    scoreElem.textContent = currentScore;
    setTimeout(loadNextQuestion, 800);
  } else {
    setTimeout(endGame, 1000);
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    timeElem.textContent = timeLeft;
    if (timeLeft <= 0) {
      stopTimer();
      endGame();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function endGame() {
  stopTimer();
  gameArea.style.display = "none";
  resultArea.style.display = "block";
  finalScoreElem.textContent = currentScore;
  saveScore();
}

playAgainBtn.addEventListener("click", () => {
  resultArea.style.display = "none";
  difficultySection.style.display = "block";
});

async function saveScore() {
  if (!currentUser) return;
  await supabase.from("scores").insert({
    user_id: currentUser.id,
    score: currentScore,
    difficulty: selectedDifficulty
  });
}
