// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentScore = 0;
let timeLeft = 10;
let timerInterval = null;
let selectedDifficulty = null;

const elements = {
  loginButton: document.getElementById("login-button"),
  logoutButton: document.getElementById("logout-button"),
  userStatus: document.getElementById("user-status"),
  userNickname: document.getElementById("user-nickname"),
  editNicknameButton: document.getElementById("edit-nickname-button"),
  editNicknameForm: document.getElementById("edit-nickname-form"),
  nicknameInput: document.getElementById("nickname-input"),
  cancelEditNicknameButton: document.getElementById("cancel-edit-nickname-button"),
  difficultySelection: document.getElementById("difficulty-selection"),
  gameArea: document.getElementById("game-area"),
  resultArea: document.getElementById("result-area"),
  playAgainButton: document.getElementById("play-again"),
  stickerImage: document.getElementById("sticker-image"),
  options: document.getElementById("options"),
  timeLeft: document.getElementById("time-left"),
  currentScore: document.getElementById("current-score"),
  finalScore: document.getElementById("final-score"),
  showLeaderboardButton: document.getElementById("show-leaderboard-button"),
  leaderboardSection: document.getElementById("leaderboard-section"),
  leaderboardList: document.getElementById("leaderboard-list"),
  closeLeaderboardButton: document.getElementById("close-leaderboard-button"),
  loadingIndicator: document.getElementById("loading-indicator"),
  errorMessage: document.getElementById("error-message")
};

function showError(message) {
  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = "block";
  }
}

function hideError() {
  if (elements.errorMessage) {
    elements.errorMessage.style.display = "none";
    elements.errorMessage.textContent = "";
  }
}

function showLoading() {
  if (elements.loadingIndicator) elements.loadingIndicator.style.display = "block";
}

function hideLoading() {
  if (elements.loadingIndicator) elements.loadingIndicator.style.display = "none";
}

function loginWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href
    }
  });
}

elements.loginButton.addEventListener("click", loginWithGoogle);

elements.logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

function displayUser(user) {
  elements.userNickname.textContent = user.user_metadata?.full_name || user.email;
  elements.userStatus.style.display = "block";
  elements.loginButton.style.display = "none";
}

async function fetchUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    displayUser(currentUser);
    elements.difficultySelection.style.display = "block";
  } else {
    elements.loginButton.style.display = "inline-block";
  }
}

function startGame() {
  elements.difficultySelection.style.display = "none";
  currentScore = 0;
  elements.currentScore.textContent = currentScore;
  elements.resultArea.style.display = "none";
  elements.gameArea.style.display = "block";
  loadNextQuestion();
}

document.querySelectorAll(".difficulty-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedDifficulty = parseInt(button.dataset.difficulty, 10);
    startGame();
  });
});

elements.playAgainButton.addEventListener("click", () => {
  elements.resultArea.style.display = "none";
  elements.difficultySelection.style.display = "block";
});

function startTimer() {
  timeLeft = 10;
  elements.timeLeft.textContent = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft--;
    elements.timeLeft.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function endGame() {
  stopTimer();
  elements.finalScore.textContent = currentScore;
  elements.gameArea.style.display = "none";
  elements.resultArea.style.display = "block";
}

async function loadNextQuestion() {
  showLoading();
  try {
    const { data, error } = await supabase
      .from("stickers")
      .select("image_url, clubs(name)")
      .eq("difficulty", selectedDifficulty)
      .order("id", { ascending: false })
      .limit(1);

    if (error || !data || !data.length) {
      showError("Failed to load question.");
      return;
    }

    const question = data[0];
    const correctAnswer = question.clubs.name;

    const { data: clubsData } = await supabase
      .from("clubs")
      .select("name")
      .neq("name", correctAnswer)
      .limit(3);

    const options = [...clubsData.map((c) => c.name), correctAnswer].sort(() => Math.random() - 0.5);

    elements.stickerImage.src = question.image_url;
    elements.options.innerHTML = "";

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => handleAnswer(opt, correctAnswer);
      elements.options.appendChild(btn);
    });

    hideError();
    hideLoading();
    startTimer();
  } catch (e) {
    showError("Error loading question.");
    hideLoading();
  }
}

function handleAnswer(selected, correct) {
  stopTimer();
  const buttons = elements.options.querySelectorAll("button");
  buttons.forEach((btn) => (btn.disabled = true));
  if (selected === correct) {
    currentScore++;
    elements.currentScore.textContent = currentScore;
    setTimeout(loadNextQuestion, 700);
  } else {
    setTimeout(endGame, 1500);
  }
}

document.addEventListener("DOMContentLoaded", fetchUser);
