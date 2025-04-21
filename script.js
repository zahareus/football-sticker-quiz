const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";

const supabase = window.supabase;
let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentScore = 0;
let selectedDifficulty = null;
let timerInterval;
let timeLeft = 10;

let stickerImageElement = document.getElementById("sticker-image");
let optionsContainerElement = document.getElementById("options");
let timeLeftElement = document.getElementById("time-left");
let currentScoreElement = document.getElementById("current-score");
let finalScoreElement = document.getElementById("final-score");

document.querySelectorAll(".difficulty-button").forEach((btn) =>
  btn.addEventListener("click", async (e) => {
    selectedDifficulty = parseInt(e.target.dataset.difficulty, 10);
    document.getElementById("difficulty-selection").style.display = "none";
    currentScore = 0;
    document.getElementById("score").style.display = "block";
    document.getElementById("game-area").style.display = "block";
    document.getElementById("current-score").textContent = "0";
    await loadNextQuestion();
  })
);

document.getElementById("play-again").addEventListener("click", () => {
  document.getElementById("result-area").style.display = "none";
  document.getElementById("score").style.display = "none";
  document.getElementById("difficulty-selection").style.display = "block";
});

async function loadNextQuestion() {
  const question = await fetchNewQuestion();
  if (!question) {
    endGame();
    return;
  }

  displayQuestion(question);
}

async function fetchNewQuestion() {
  try {
    const { data: stickers, error: stickerError } = await supabaseClient
      .from("stickers")
      .select("image_url, clubs ( id, name )")
      .eq("difficulty", selectedDifficulty);

    if (stickerError || !stickers || stickers.length === 0) {
      console.error(stickerError || "No stickers found.");
      return null;
    }

    const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
    const correctClub = randomSticker.clubs;

    const { data: allClubs, error: clubsError } = await supabaseClient
      .from("clubs")
      .select("id, name");

    if (clubsError || !allClubs) {
      console.error(clubsError || "No clubs found.");
      return null;
    }

    const incorrectClubs = allClubs
      .filter((club) => club.id !== correctClub.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [...incorrectClubs.map((c) => c.name), correctClub.name].sort(() => 0.5 - Math.random());

    return {
      imageUrl: randomSticker.image_url,
      correctAnswer: correctClub.name,
      options: options,
    };
  } catch (err) {
    console.error("Error fetching question:", err);
    return null;
  }
}

function displayQuestion(question) {
  stickerImageElement.src = question.imageUrl;
  stickerImageElement.alt = "Sticker";

  optionsContainerElement.innerHTML = "";
  question.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.onclick = () => handleAnswer(option, question.correctAnswer);
    optionsContainerElement.appendChild(btn);
  });

  timeLeft = 10;
  timeLeftElement.textContent = timeLeft;
  startTimer();
}

function handleAnswer(selected, correct) {
  stopTimer();
  document.querySelectorAll("#options button").forEach((btn) => (btn.disabled = true));

  if (selected === correct) {
    currentScore++;
    currentScoreElement.textContent = currentScore;
    setTimeout(loadNextQuestion, 800);
  } else {
    endGame();
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    timeLeft--;
    timeLeftElement.textContent = timeLeft;

    if (timeLeft <= 0) {
      stopTimer();
      endGame();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function endGame() {
  document.getElementById("game-area").style.display = "none";
  finalScoreElement.textContent = currentScore;
  document.getElementById("result-area").style.display = "block";
}
