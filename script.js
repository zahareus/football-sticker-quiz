// script.js

// Global variables
let currentUser = null;
let currentDifficulty = null;
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let gameData = [];
let gameInProgress = false;

// DOM elements
const landingPageElement = document.getElementById('landing-page');
const difficultySelectionElement = document.getElementById('difficulty-selection');
const gameAreaElement = document.getElementById('game-area');
const resultAreaElement = document.getElementById('result-area');
const leaderboardSectionElement = document.getElementById('leaderboard-section');
const stickerImageElement = document.getElementById('sticker-image');
const optionsContainerElement = document.getElementById('options-container');
const timerElement = document.getElementById('time-left');
const scoreElement = document.getElementById('current-score');
const finalScoreElement = document.getElementById('final-score');
const authSectionElement = document.getElementById('auth-section');
const userStatusElement = document.getElementById('user-status');
const editNicknameFormElement = document.getElementById('edit-nickname-form');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
    checkAuthState();
});

// Authentication functions
function initializeAuth() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainApp();
    } else {
        showLandingPage();
    }
}

function checkAuthState() {
    if (currentUser) {
        updateUserDisplay();
    }
}

function showLandingPage() {
    document.body.classList.add('logged-out');
    hideAllSections();
    landingPageElement.style.display = 'block';
}

function showMainApp() {
    document.body.classList.remove('logged-out');
    hideAllSections();
    difficultySelectionElement.style.display = 'block';
    updateUserDisplay();
}

function updateUserDisplay() {
    if (currentUser) {
        userStatusElement.innerHTML = `
            <span>Welcome, <strong id="user-nickname">${currentUser.nickname}</strong></span>
            <button class="btn-link btn-small" onclick="showEditNickname()">Edit</button>
            <button class="btn-link btn-small" onclick="logout()">Logout</button>
        `;
    }
}

function showEditNickname() {
    editNicknameFormElement.style.display = 'block';
    document.getElementById('nickname-input').value = currentUser.nickname;
}

function hideEditNickname() {
    editNicknameFormElement.style.display = 'none';
}

function saveNickname() {
    const newNickname = document.getElementById('nickname-input').value.trim();
    if (newNickname && newNickname !== currentUser.nickname) {
        currentUser.nickname = newNickname;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
    }
    hideEditNickname();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    resetGame();
    showLandingPage();
}

// Guest login
function loginAsGuest() {
    const guestNickname = document.getElementById('guest-nickname').value.trim();
    if (!guestNickname) {
        alert('Please enter a nickname');
        return;
    }
    
    currentUser = {
        id: 'guest_' + Date.now(),
        nickname: guestNickname,
        type: 'guest'
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showMainApp();
}

// Google login (placeholder)
function loginWithGoogle() {
    // This would integrate with Google OAuth in a real app
    alert('Google login would be implemented here');
}

// Game functions
function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    startGame();
}

async function startGame() {
    if (gameInProgress) return;
    
    gameInProgress = true;
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = getDifficultyTime();
    
    try {
        await loadGameData();
        hideAllSections();
        gameAreaElement.style.display = 'block';
        updateScore();
        displayQuestion();
        startTimer();
    } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to load game data. Please try again.');
        gameInProgress = false;
    }
}

function getDifficultyTime() {
    switch (currentDifficulty) {
        case 'easy': return 45;
        case 'medium': return 30;
        case 'hard': return 20;
        default: return 30;
    }
}

async function loadGameData() {
    // Show loading indicator
    stickerImageElement.src = '';
    stickerImageElement.alt = 'Loading...';
    
    try {
        const response = await fetch(`/api/quiz-data?difficulty=${currentDifficulty}`);
        if (!response.ok) {
            throw new Error('Failed to fetch quiz data');
        }
        gameData = await response.json();
        
        if (!gameData || gameData.length === 0) {
            throw new Error('No quiz data available');
        }
    } catch (error) {
        console.error('Error loading game data:', error);
        throw error;
    }
}

function displayQuestion() {
    if (currentQuestionIndex >= gameData.length) {
        endGame();
        return;
    }
    
    const questionData = gameData[currentQuestionIndex];
    
    // Update sticker image
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.alt = questionData.correctAnswer;
    stickerImageElement.classList.add('fade-in');
    
    // Clear previous options
    optionsContainerElement.innerHTML = '';
    
    // Create option buttons - ВИПРАВЛЕННЯ ТУТ!
    questionData.options.forEach((optionText) => {
        const button = document.createElement('button');
        // Видаляємо клас 'btn' щоб кнопки стилізувалися через .options-group button
        button.textContent = optionText;
        button.disabled = false;
        button.classList.remove('correct-answer', 'incorrect-answer');
        button.addEventListener('click', () => handleAnswer(optionText));
        optionsContainerElement.appendChild(button);
    });
}

function handleAnswer(selectedAnswer) {
    if (!gameInProgress) return;
    
    const questionData = gameData[currentQuestionIndex];
    const isCorrect = selectedAnswer === questionData.correctAnswer;
    
    // Disable all buttons
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = true;
        if (button.textContent === questionData.correctAnswer) {
            button.classList.add('correct-answer');
        } else if (button.textContent === selectedAnswer && !isCorrect) {
            button.classList.add('incorrect-answer');
        }
    });
    
    if (isCorrect) {
        score += getScoreForDifficulty();
        updateScore();
    }
    
    // Move to next question after delay
    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 1500);
}

function getScoreForDifficulty() {
    switch (currentDifficulty) {
        case 'easy': return 10;
        case 'medium': return 20;
        case 'hard': return 30;
        default: return 20;
    }
}

function updateScore() {
    scoreElement.textContent = score;
    scoreElement.classList.add('score-updated');
    setTimeout(() => {
        scoreElement.classList.remove('score-updated');
    }, 400);
}

function startTimer() {
    timerElement.textContent = timeLeft;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerElement.classList.add('low-time');
            timerElement.classList.add('timer-tick-animation');
            setTimeout(() => {
                timerElement.classList.remove('timer-tick-animation');
            }, 350);
        }
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function endGame() {
    gameInProgress = false;
    clearInterval(timerInterval);
    
    hideAllSections();
    resultAreaElement.style.display = 'block';
    
    finalScoreElement.textContent = score;
    finalScoreElement.classList.add('final-score-animated');
    
    // Save score
    saveScore();
    
    // Show save message
    setTimeout(() => {
        const saveMessage = document.querySelector('.save-message');
        if (saveMessage) {
            saveMessage.style.display = 'block';
        }
    }, 1100);
}

function saveScore() {
    if (!currentUser) return;
    
    const scoreData = {
        userId: currentUser.id,
        nickname: currentUser.nickname,
        score: score,
        difficulty: currentDifficulty,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage (in a real app, this would be sent to a server)
    let scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
    scores.push(scoreData);
    
    // Keep only last 100 scores
    if (scores.length > 100) {
        scores = scores.slice(-100);
    }
    
    localStorage.setItem('gameScores', JSON.stringify(scores));
}

function resetGame() {
    gameInProgress = false;
    clearInterval(timerInterval);
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = 30;
    gameData = [];
    
    // Reset UI elements
    timerElement.classList.remove('low-time', 'timer-tick-animation');
    scoreElement.classList.remove('score-updated');
    finalScoreElement.classList.remove('final-score-animated');
    stickerImageElement.classList.remove('fade-in');
}

function playAgain() {
    resetGame();
    hideAllSections();
    difficultySelectionElement.style.display = 'block';
}

// Leaderboard functions
function showLeaderboard() {
    hideAllSections();
    leaderboardSectionElement.style.display = 'block';
    displayLeaderboard('all', 'all');
}

function displayLeaderboard(difficulty = 'all', timeframe = 'all') {
    const scores = JSON.parse(localStorage.getItem('gameScores') || '[]');
    let filteredScores = scores;
    
    // Filter by difficulty
    if (difficulty !== 'all') {
        filteredScores = filteredScores.filter(score => score.difficulty === difficulty);
    }
    
    // Filter by timeframe
    if (timeframe !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (timeframe) {
            case 'today':
                cutoffDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
        }
        
        filteredScores = filteredScores.filter(score => 
            new Date(score.timestamp) >= cutoffDate
        );
    }
    
    // Sort by score (descending)
    filteredScores.sort((a, b) => b.score - a.score);
    
    // Take top 10
    filteredScores = filteredScores.slice(0, 10);
    
    // Display leaderboard
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    if (filteredScores.length === 0) {
        leaderboardList.innerHTML = '<li style="text-align: center; padding: 20px;">No scores found for the selected filters.</li>';
        return;
    }
    
    filteredScores.forEach((scoreData) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="player-name">${scoreData.nickname}</span>
            <span class="player-score">${scoreData.score}</span>
            <span class="player-difficulty">${scoreData.difficulty}</span>
        `;
        
        // Highlight current user's score
        if (currentUser && scoreData.userId === currentUser.id) {
            li.classList.add('user-score');
        }
        
        leaderboardList.appendChild(li);
    });
}

function filterLeaderboard() {
    const difficulty = document.getElementById('difficulty-filter').value;
    const timeframe = document.getElementById('timeframe-filter').value;
    displayLeaderboard(difficulty, timeframe);
}

// Utility functions
function hideAllSections() {
    landingPageElement.style.display = 'none';
    difficultySelectionElement.style.display = 'none';
    gameAreaElement.style.display = 'none';
    resultAreaElement.style.display = 'none';
    leaderboardSectionElement.style.display = 'none';
}

function showError(message) {
    // Create or update error message element
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'error-message';
        document.querySelector('.container').appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Event listeners setup
function setupEventListeners() {
    // Guest login form
    const guestForm = document.getElementById('guest-login-form');
    if (guestForm) {
        guestForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loginAsGuest();
        });
    }
    
    // Edit nickname form
    const editNicknameForm = document.getElementById('edit-nickname-form');
    if (editNicknameForm) {
        editNicknameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveNickname();
        });
    }
    
    // Close edit nickname form when clicking outside
    document.addEventListener('click', (e) => {
        if (editNicknameFormElement.style.display === 'block' && 
            !editNicknameFormElement.contains(e.target) && 
            !e.target.closest('#user-nickname')) {
            hideEditNickname();
        }
    });
    
    // Leaderboard filters
    const difficultyFilter = document.getElementById('difficulty-filter');
    const timeframeFilter = document.getElementById('timeframe-filter');
    
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', filterLeaderboard);
    }
    
    if (timeframeFilter) {
        timeframeFilter.addEventListener('change', filterLeaderboard);
    }
    
    // Image fade-in animation reset
    if (stickerImageElement) {
        stickerImageElement.addEventListener('animationend', () => {
            stickerImageElement.classList.remove('fade-in');
        });
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!gameInProgress) return;
    
    // Allow answering with number keys 1-4
    if (e.key >= '1' && e.key <= '4') {
        const buttonIndex = parseInt(e.key) - 1;
        const buttons = optionsContainerElement.querySelectorAll('button');
        if (buttons[buttonIndex] && !buttons[buttonIndex].disabled) {
            buttons[buttonIndex].click();
        }
    }
});

// Handle page visibility changes (pause game when tab is not active)
document.addEventListener('visibilitychange', () => {
    if (gameInProgress && document.hidden) {
        // Optionally pause the timer when tab is not visible
        // This prevents cheating by switching tabs
    }
});

// Export functions for global access (if needed)
window.selectDifficulty = selectDifficulty;
window.playAgain = playAgain;
window.showLeaderboard = showLeaderboard;
window.loginAsGuest = loginAsGuest;
window.loginWithGoogle = loginWithGoogle;
window.showEditNickname = showEditNickname;
window.hideEditNickname = hideEditNickname;
window.saveNickname = saveNickname;
window.logout = logout;
window.filterLeaderboard = filterLeaderboard;
