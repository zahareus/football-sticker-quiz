// script.js

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co"; // <-- ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw"; // <-- ЗАМІНИ НА СВІЙ ANON KEY

let supabaseClient;

// ----- 2. Initialize Supabase Client -----
if (typeof supabase === 'undefined') {
    console.error('Error: Supabase client library not loaded.');
    handleCriticalError('Error loading game. Please refresh the page.');
} else {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully.');
        checkInitialAuthState(); // Перевіряємо початковий стан автентифікації

        // Чекаємо на завантаження DOM перед ініціалізацією додатку
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp(); // DOM вже завантажено
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        handleCriticalError('Error connecting to the game. Please refresh the page.');
        supabaseClient = null; // Робимо клієнт null, щоб інші функції знали про помилку
    }
}

// ----- 3. Global Game State Variables -----
let currentQuestionData = null;
let currentScore = 0;
let timeLeft = 10; // Seconds per question
let timerInterval = null;
let currentUser = null; // Stores Supabase user object
let selectedDifficulty = 1; // Default difficulty
let currentLeaderboardTimeframe = 'all';
let currentLeaderboardDifficulty = 1;
let currentUserProfile = null; // Cache user profile {id, username}
let loadingTimerId = null; // <<<--- NEW: Timer ID for delayed loading indicator

// ----- 4. DOM Element References -----
let gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, /*userEmailElement,*/ logoutButton, difficultySelectionElement, loadingIndicator, errorMessageElement;
let difficultyButtons; // NodeList
let leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, leaderboardTimeFilterButtons, leaderboardDifficultyFilterButtons; // NodeLists
// Nickname elements
let userNicknameElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton; // Save is handled via form submit

// Nickname Generation Words
const NICKNAME_ADJECTIVES = ["Fast", "Quick", "Happy", "Silent", "Blue", "Red", "Green", "Golden", "Iron", "Clever", "Brave", "Wise", "Lucky", "Shiny", "Dark", "Light", "Great", "Tiny", "Magic"];
const NICKNAME_NOUNS = ["Fox", "Wolf", "Mouse", "Tiger", "Car", "Tree", "Eagle", "Lion", "Shark", "Puma", "Star", "Moon", "Sun", "River", "Stone", "Blade", "Bear", "Horse", "Ship"];

// Initialize DOM Elements (UPDATED for nickname edit)
function initializeDOMElements() {
    // console.log("initializeDOMElements: Finding elements..."); // Less verbose logging
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
    userNicknameElement = document.getElementById('user-nickname'); // <-- Use the new ID
    logoutButton = document.getElementById('logout-button');
    difficultySelectionElement = document.getElementById('difficulty-selection');
    loadingIndicator = document.getElementById('loading-indicator');
    errorMessageElement = document.getElementById('error-message');
    difficultyButtons = document.querySelectorAll('.difficulty-button');
    leaderboardSectionElement = document.getElementById('leaderboard-section');
    leaderboardListElement = document.getElementById('leaderboard-list');
    closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    showLeaderboardButton = document.getElementById('show-leaderboard-button');
    leaderboardTimeFilterButtons = document.querySelectorAll('.leaderboard-time-filter');
    leaderboardDifficultyFilterButtons = document.querySelectorAll('.leaderboard-difficulty-filter');

    // Nickname edit elements
    editNicknameButton = document.getElementById('edit-nickname-button');
    editNicknameForm = document.getElementById('edit-nickname-form');
    nicknameInputElement = document.getElementById('nickname-input');
    cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');

    // Check ALL elements
    const elements = { gameAreaElement, stickerImageElement, optionsContainerElement, timeLeftElement, currentScoreElement, resultAreaElement, finalScoreElement, playAgainButton, authSectionElement, loginButton, userStatusElement, userNicknameElement, logoutButton, difficultySelectionElement, leaderboardSectionElement, leaderboardListElement, closeLeaderboardButton, showLeaderboardButton, loadingIndicator, errorMessageElement, editNicknameButton, editNicknameForm, nicknameInputElement, cancelEditNicknameButton };
    let allFound = true;
    for (const key in elements) {
        if (!elements[key]) {
             const idName = key.replace('Element', '').replace('Button',''); // Simple way to guess ID
             console.error(`Error: Could not find DOM element '${idName}'! Check HTML ID.`);
             allFound = false;
        }
    }
    if (!difficultyButtons || difficultyButtons.length !== 3) { console.error("Error: Did not find 3 difficulty buttons!"); allFound = false; }
    if (!leaderboardTimeFilterButtons || leaderboardTimeFilterButtons.length === 0) { console.error("Error: Could not find leaderboard time filter buttons!"); allFound = false; }
    if (!leaderboardDifficultyFilterButtons || leaderboardDifficultyFilterButtons.length === 0) { console.error("Error: Could not find leaderboard difficulty filter buttons!"); allFound = false; }

    if (!allFound) { console.error("initializeDOMElements: Not all required elements found."); handleCriticalError("UI Error: Missing page elements."); return false; }

    // Add event listeners
    // console.log("initializeDOMElements: Adding event listeners...");
    playAgainButton.addEventListener('click', showDifficultySelection);
    loginButton.addEventListener('click', loginWithGoogle);
    logoutButton.addEventListener('click', logout);
    difficultyButtons.forEach(button => { button.addEventListener('click', handleDifficultySelection); });
    showLeaderboardButton.addEventListener('click', openLeaderboard);
    closeLeaderboardButton.addEventListener('click', closeLeaderboard);
    leaderboardTimeFilterButtons.forEach(button => { button.addEventListener('click', handleTimeFilterChange); });
    leaderboardDifficultyFilterButtons.forEach(button => { button.addEventListener('click', handleDifficultyFilterChange); });

    // Nickname edit listeners
    userNicknameElement.addEventListener('click', showNicknameEditForm); // Click on nickname
    editNicknameButton.addEventListener('click', showNicknameEditForm); // Click on edit icon
    editNicknameForm.addEventListener('submit', handleNicknameSave);     // Form submission
    cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm); // Cancel button

    console.log("DOM elements initialized and listeners added successfully.");
    return true; // Indicate success
}

// ----- 5. Authentication Functions -----
async function loginWithGoogle() {
    if (!supabaseClient) return showError("Supabase client is not initialized."); hideError(); // Clear previous errors
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.href // Redirect back here after login
            }
        });
        if (error) throw error; // Throw error to be caught by catch block
        // Redirect happens automatically
    } catch (error) {
        console.error("Login error:", error);
        showError(`Login failed: ${error.message}`);
    }
}

async function logout() {
    if (!supabaseClient) {
        console.error("Logout attempt failed: Supabase client not initialized.");
        return showError("Supabase client is not initialized.");
    }
    console.log("Attempting to sign out..."); hideError();
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            throw error; // Handle error in catch block
        }
        console.log("SignOut successful.");
        // onAuthStateChange will handle UI updates
    } catch (error) {
        console.error("Logout error:", error);
        showError(`Logout failed: ${error.message}`);
    }
}

// Update UI based on auth state (uses userNicknameElement)
function updateAuthStateUI(user) {
   // console.log("Running updateAuthStateUI. User:", user ? user.id : 'null'); // Less verbose

   // Ensure critical elements needed for this function are available
   if (!loginButton || !userStatusElement || !difficultySelectionElement || !userNicknameElement || !showLeaderboardButton || !editNicknameButton) {
       console.warn("updateAuthStateUI: Key DOM elements not ready yet!");
       return; // Don't proceed if elements aren't found
   }

   hideNicknameEditForm(); // Always hide edit form initially when auth state changes

   if (user) {
       currentUser = user; // Store user object globally
       // Use cached profile username if available, otherwise fallback to email or 'Loading...'
       userNicknameElement.textContent = currentUserProfile?.username || user.email || 'Loading...';
       userStatusElement.style.display = 'block'; // Show welcome message and logout
       loginButton.style.display = 'none'; // Hide login button
       showLeaderboardButton.style.display = 'block'; // Show leaderboard button (make it block)
       editNicknameButton.style.display = 'inline-block'; // Show edit nickname button

       // If user logs in, and no game/results/leaderboard are active, show difficulty selection
       if (gameAreaElement?.style.display === 'none' && resultAreaElement?.style.display === 'none' && leaderboardSectionElement?.style.display === 'none') {
           showDifficultySelection();
       } else {
           // If game/results/leaderboard *are* visible, don't show difficulty selection over them
           if (difficultySelectionElement) difficultySelectionElement.style.display = 'none';
       }
       // console.log("UI Updated: User logged in."); // Less verbose
   } else {
       currentUser = null; // Clear user object
       currentUserProfile = null; // Clear profile cache
       if (loginButton) { loginButton.style.display = 'block'; } else { console.error("updateAuthStateUI: loginButton is null!"); } // Show login button
       if (userStatusElement) userStatusElement.style.display = 'none'; // Hide welcome message
       if (difficultySelectionElement) difficultySelectionElement.style.display = 'none'; // Hide difficulty selection
       if (showLeaderboardButton) showLeaderboardButton.style.display = 'block'; // Leaderboard button might still be visible (make it block)
       if (editNicknameButton) editNicknameButton.style.display = 'none'; // Hide edit nickname button

       // Stop game if user logs out during play
       stopTimer();
       if(gameAreaElement) gameAreaElement.style.display = 'none';
       if(resultAreaElement) resultAreaElement.style.display = 'none';
       if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; // Also hide leaderboard

       // console.log("UI Updated: User logged out."); // Less verbose
   }
}

// Generates a random nickname
function generateRandomNickname() {
    const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
    const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
    return `${adj} ${noun}`;
}

// Check if user profile exists, create one if not (UPDATED - caches profile, updates nickname element)
async function checkAndCreateUserProfile(user) {
   if (!supabaseClient || !user) return;
   console.log(`checkAndCreateUserProfile for user ${user.id}...`);
   currentUserProfile = null; // Reset cache before fetching/creating
   let finalUsernameToShow = user.email || 'User'; // Fallback display name

   try {
       // Check if profile exists using maybeSingle() which doesn't error if no row found
       let { data: profileData, error: selectError } = await supabaseClient
           .from('profiles')
           .select('id, username')
           .eq('id', user.id)
           .maybeSingle(); // Returns null instead of error if no row found

       // Handle potential select errors (excluding the "no row" case which is handled by maybeSingle)
       if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = RangeError (expected 1 row, got 0) - ignore this
           throw selectError;
       }

       if (!profileData) {
           // Profile doesn't exist, create it
           console.log(`Profile not found for user ${user.id}. Creating...`);
           const randomNickname = generateRandomNickname();
           const { data: insertedProfile, error: insertError } = await supabaseClient
               .from('profiles')
               .insert({ id: user.id, username: randomNickname, updated_at: new Date() })
               .select('id, username') // Select the newly created profile data
               .single(); // Expect exactly one row to be inserted

           if (insertError) throw insertError; // Handle insert errors

           currentUserProfile = insertedProfile; // Cache the newly created profile
           finalUsernameToShow = insertedProfile?.username || finalUsernameToShow; // Use new nickname
           console.log(`Profile created with nickname: ${finalUsernameToShow}`);
       } else {
           // Profile exists
           currentUserProfile = profileData; // Cache existing profile
           finalUsernameToShow = profileData.username || finalUsernameToShow; // Use existing nickname
           console.log(`Profile exists for user ${user.id}. Username: ${finalUsernameToShow}`);
       }

       // Update the UI nickname display element regardless of whether profile was created or existed
       if (userNicknameElement) {
           userNicknameElement.textContent = finalUsernameToShow;
       } else {
           console.warn("checkAndCreateUserProfile: userNicknameElement not found to update UI.");
       }

   } catch (error) {
       console.error("Error in checkAndCreateUserProfile:", error);
       showError(`Profile Error: ${error.message}`);
       // Attempt to update UI with fallback even if there was an error
       if (userNicknameElement) {
           userNicknameElement.textContent = finalUsernameToShow;
       }
       currentUserProfile = null; // Ensure profile cache is null on error
   }
}


// Auth State Change Listener Setup
function setupAuthStateChangeListener() {
    if (!supabaseClient) {
        console.error("Cannot setup auth listener: Supabase client not initialized.");
        return;
    }
    console.log("Setting up onAuthStateChange listener...");

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        // console.log(`Auth Event: ${_event}, Session exists: ${!!session}`); // Less verbose
        const user = session?.user ?? null;

         // Ensure DOM elements are ready before updating UI (important for initial load)
         // We assume elements are found after initializeApp runs successfully
         updateAuthStateUI(user); // Update basic UI (show/hide login/logout, welcome msg)

         // If user just signed in, check/create their profile
         if (_event === 'SIGNED_IN' && user) {
              await checkAndCreateUserProfile(user); // Load/Create profile & update display name
         }

        // Additional logic based on event type if needed
        if (_event === 'SIGNED_OUT') {
            console.log("User signed out, resetting state.");
        }
         if (_event === 'USER_UPDATED') {
            console.log("User data updated (e.g., email change).");
         }
    });
    console.log("onAuthStateChange listener setup complete.");
}


// Check Initial Auth State on Load
async function checkInitialAuthState() {
    if (!supabaseClient) { return; };
    console.log("Checking initial auth state...");
    try {
        // Use getSession instead of getUser to get session info including user
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        currentUser = session?.user ?? null; // Set global currentUser based on session
        console.log("Initial auth state checked.", currentUser ? `User logged in: ${currentUser.id}` : "No active session found.");

        // If user is logged in on initial page load, fetch their profile immediately
        if (currentUser) {
            await checkAndCreateUserProfile(currentUser);
        }

    } catch (error) {
        console.error("Error getting initial session:", error);
        // Ensure user state is cleared if session check fails
        currentUser = null;
        currentUserProfile = null;
    }
}


// ----- 5.5 Nickname Editing Functions -----
function showNicknameEditForm() {
    // Ensure necessary elements and data are present
    if (!currentUserProfile || !userNicknameElement || !editNicknameButton || !editNicknameForm || !nicknameInputElement) {
        console.error("Cannot show nickname edit form - elements missing or profile not loaded.");
        return;
    }
    console.log("Showing nickname edit form."); hideError();

    // Populate the input with the current username
    nicknameInputElement.value = currentUserProfile.username || '';

    // Hide the display elements, show the form
    // userNicknameElement.style.display = 'none'; // Keep nickname visible maybe?
    // editNicknameButton.style.display = 'none'; // Hide the pencil icon too
    editNicknameForm.style.display = 'block'; // Show the form (CSS positions it)

    // Focus and select the input field for easier editing
    nicknameInputElement.focus();
    nicknameInputElement.select();
}

function hideNicknameEditForm() {
    // Ensure elements exist before trying to hide/show them
    if (!editNicknameForm || !nicknameInputElement) {
        return;
    }
    editNicknameForm.style.display = 'none'; // Hide the form
    nicknameInputElement.value = ''; // Clear the input

    // Re-enable buttons if needed (handled by main UI updates)
}

async function handleNicknameSave(event) {
    event.preventDefault(); // Prevent default form submission (page reload)

    if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) {
        showError("Cannot save nickname. Please ensure you are logged in.");
        return;
    }

    const newNickname = nicknameInputElement.value.trim(); // Get trimmed value from input
    console.log(`Attempting to save new nickname: "${newNickname}" for user ${currentUser.id}`);

    // Basic validation
    if (!newNickname || newNickname.length < 3 || newNickname.length > 25) {
        showError("Nickname must be between 3 and 25 characters long.");
        return;
    }

    // Check if the nickname actually changed
    if (newNickname === currentUserProfile.username) {
        console.log("Nickname unchanged, hiding form.");
        hideNicknameEditForm(); // Just hide the form, no need to save
        return;
    }

    // Show loading indicator, hide previous errors
    showLoading(); hideError();

    try {
        // Update the 'username' and 'updated_at' columns in the 'profiles' table
        const { data: updatedData, error } = await supabaseClient
            .from('profiles')
            .update({ username: newNickname, updated_at: new Date() })
            .eq('id', currentUser.id) // Ensure we only update the current user's profile
            .select('username') // Select the updated username to confirm
            .single(); // Expect one row to be updated

        if (error) throw error; // Handle Supabase errors

        console.log("Nickname updated successfully in DB:", updatedData);

        // Update local cache
        currentUserProfile.username = updatedData.username;

        // Update the UI display element
        if (userNicknameElement) {
            userNicknameElement.textContent = updatedData.username;
        }

        hideNicknameEditForm(); // Hide the form on success

        // Show temporary success message
        showError("Nickname updated successfully!");
        setTimeout(hideError, 2500); // Hide message after 2.5 seconds

        // Refresh leaderboard if it's currently displayed
        if (leaderboardSectionElement?.style.display === 'block') {
            console.log("Leaderboard is open, refreshing...");
            updateLeaderboard();
        }

    } catch (error) {
        console.error("Error updating nickname:", error);
        showError(`Failed to update nickname: ${error.message}`);
    } finally {
        hideLoading(); // Hide loading indicator regardless of success/failure
    }
}


// ----- 6. Display Question Function -----
function displayQuestion(questionData) {
    // Ensure elements and data are valid
    if (!questionData || !stickerImageElement || !optionsContainerElement || !timeLeftElement || !currentScoreElement || !gameAreaElement || !resultAreaElement) {
        console.error("displayQuestion: Missing elements or data.");
        showError("Error displaying question. Please try starting a new game.");
        endGame(); // End game if critical elements are missing
        return;
    }

    currentQuestionData = questionData; // Store current question data globally
    hideError(); // Clear previous errors

    // Reset image state
    stickerImageElement.src = ""; // Clear previous image src first
    stickerImageElement.alt = "Loading sticker..."; // Set loading alt text

    // Set new image source and handle loading/error
    stickerImageElement.src = questionData.imageUrl;
    stickerImageElement.onerror = () => {
        console.error(`Error loading image: ${questionData.imageUrl}`);
        showError("Failed to load sticker image. Ending game.");
        stickerImageElement.alt = "Error loading image";
        stickerImageElement.src = ""; // Clear broken src
        setTimeout(endGame, 500); // End the game after a short delay
    };
    stickerImageElement.onload = () => {
        stickerImageElement.alt = "Club Sticker"; // Set proper alt text on successful load
    };

    // Clear previous options and create new ones
    optionsContainerElement.innerHTML = ''; // Clear old buttons
    if (questionData.options && Array.isArray(questionData.options)) {
        questionData.options.forEach((optionText) => {
            const button = document.createElement('button');
            // Assign class for styling via CSS
            button.className = 'btn'; // Use the base button class from new CSS
            button.textContent = optionText;
            button.disabled = false; // Ensure buttons are enabled initially
            // Remove result classes in case they were somehow left from previous round
            button.classList.remove('correct-answer', 'incorrect-answer');
            button.addEventListener('click', () => handleAnswer(optionText)); // Add click listener
            optionsContainerElement.appendChild(button);
        });
    } else {
        console.error("Invalid options data:", questionData.options);
        showError("Error displaying answer options. Ending game.");
        setTimeout(endGame, 500);
        return; // Stop execution
    }

    // Reset timer and score display
    timeLeft = 10;
    if(timeLeftElement) timeLeftElement.textContent = timeLeft;
    if(currentScoreElement) currentScoreElement.textContent = currentScore;

    // Show game area, hide results
    if(gameAreaElement) gameAreaElement.style.display = 'block';
    if(resultAreaElement) resultAreaElement.style.display = 'none';

    startTimer(); // Start the countdown timer
}


// ----- 7. Handle User Answer Function -----
function handleAnswer(selectedOption) {
    stopTimer(); // Stop the timer immediately
    hideError(); // Clear any previous errors

    if (!currentQuestionData || !optionsContainerElement) {
        console.error("handleAnswer: Missing question data or options container.");
        return; // Cannot process answer
    }

    // Disable all option buttons after an answer is chosen
    const buttons = optionsContainerElement.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);

    const isCorrect = selectedOption === currentQuestionData.correctAnswer;

    if (isCorrect) {
        currentScore++; // Increment score
        if(currentScoreElement) currentScoreElement.textContent = currentScore; // Update score display

        // Highlight the correct answer button
        buttons.forEach(button => {
            if (button.textContent === selectedOption) {
                button.classList.add('correct-answer');
            }
        });

        // Load the next question after a short delay
        setTimeout(loadNextQuestion, 700); // 0.7 second delay
    } else {
        // Highlight both the correct answer and the incorrect selection
        buttons.forEach(button => {
            if (button.textContent === currentQuestionData.correctAnswer) {
                button.classList.add('correct-answer'); // Show the right answer
            }
            if (button.textContent === selectedOption) {
                button.classList.add('incorrect-answer'); // Show the wrong choice
            }
        });

        // End the game after a longer delay to show the result
        setTimeout(endGame, 1500); // 1.5 second delay
    }
}


 // ----- 8. Timer Functions -----
function startTimer() {
    stopTimer(); // Clear any existing timer first
    timeLeft = 10; // Reset time

    if(!timeLeftElement) {
        console.error("startTimer: timeLeftElement not found.");
        return; // Cannot start timer without the display element
    }
    timeLeftElement.textContent = timeLeft; // Initial display

    timerInterval = setInterval(() => {
        timeLeft--; // Decrement time

        // Update display, check if element still exists
        if(timeLeftElement) {
             try { // Use try-catch as a precaution, though checking existence is usually enough
                 timeLeftElement.textContent = timeLeft.toString();
             } catch(e) {
                 console.error("Error updating timer display:", e);
                 stopTimer(); // Stop timer if display fails
             }
        } else {
             console.warn("Timer running but timeLeftElement missing.");
             stopTimer(); // Stop timer if display element disappears
             return;
        }

        // Check if time ran out
        if (timeLeft <= 0) {
            stopTimer();
            console.log("Time ran out!");
            // Indicate time ran out - maybe highlight correct answer briefly?
            if (optionsContainerElement && currentQuestionData) {
                const buttons = optionsContainerElement.querySelectorAll('button');
                buttons.forEach(button => {
                    button.disabled = true; // Disable buttons
                    // Optionally highlight the correct answer when time runs out
                    if (button.textContent === currentQuestionData.correctAnswer) {
                        button.classList.add('correct-answer'); // Use the existing correct class
                    }
                });
            }
            // End the game after a delay
            setTimeout(endGame, 1500); // Delay to show the highlighted answer
        }
    }, 1000); // Run every second
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null; // Reset interval ID
    }
}


// ----- 9. Game Flow Functions -----
function showDifficultySelection() {
    hideError(); // Clear errors

    // Ensure elements are ready
    if (!difficultySelectionElement || !userStatusElement || !gameAreaElement || !resultAreaElement || !leaderboardSectionElement) {
        console.warn("showDifficultySelection: Some UI elements missing, attempting to re-init.");
        if (!initializeDOMElements()) { // Try to re-initialize if elements were missing
            handleCriticalError("UI Error initializing difficulty selection.");
            return;
        }
    }

    // Hide other views
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';

    // Show difficulty selection and user status
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'block';
    // User status visibility is handled by updateAuthStateUI

    console.log("Showing difficulty selection screen.");
}

function handleDifficultySelection(event) {
    // Get difficulty from data attribute
    const difficulty = parseInt(event.target.dataset.difficulty, 10);
    if (![1, 2, 3].includes(difficulty)) {
        console.error("Invalid difficulty selected:", event.target.dataset.difficulty);
        return; // Ignore invalid clicks
    }
    selectedDifficulty = difficulty; // Store selected difficulty
    console.log(`Difficulty ${selectedDifficulty} selected.`);

    // Hide difficulty selection and start the game
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';
    startGame();
}

async function startGame() {
    hideError(); // Clear previous errors

    // Ensure a difficulty level is selected
    if (selectedDifficulty === null || ![1, 2, 3].includes(selectedDifficulty)) {
        console.warn("startGame: No valid difficulty selected. Showing selection screen.");
        showDifficultySelection();
        return;
    }

    // Ensure essential game elements are present
    if (!gameAreaElement || !currentScoreElement || !resultAreaElement || !optionsContainerElement) {
         console.error("startGame: Missing critical game elements.");
         // Attempt re-init just in case, though unlikely needed if app started correctly
         if (!initializeDOMElements()) {
             handleCriticalError("Failed to initialize UI for game start.");
             return;
         }
     }


    // Reset game state
    currentScore = 0;
    if (currentScoreElement) currentScoreElement.textContent = 0;

    // Hide result area and remove previous 'score saved' message if present
    if (resultAreaElement) {
        const msg = resultAreaElement.querySelector('.save-message');
        if(msg) msg.remove(); // Remove old message
        resultAreaElement.style.display = 'none';
    }

    // Hide difficulty selection (should already be hidden, but double-check)
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';

    // Show game area
    if (gameAreaElement) gameAreaElement.style.display = 'block';
    // Clear any leftover options
    if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; }

    // User status visibility is handled by updateAuthStateUI

    console.log(`Starting game with difficulty: ${selectedDifficulty}`);
    // Load the first question
    await loadNextQuestion();
}

async function loadNextQuestion() {
    console.log("loadNextQuestion: Attempting to load new question data...");

    // --- Optimization: Clear old options immediately for smoother transition ---
    // if (optionsContainerElement) { optionsContainerElement.innerHTML = ''; } // Clear old buttons faster

    const questionData = await loadNewQuestion(); // Fetch data from Supabase

    if (questionData) {
        // console.log("loadNextQuestion: Data received, calling displayQuestion."); // Less verbose
        displayQuestion(questionData); // Display the fetched question
    } else {
        // Handle case where loadNewQuestion failed (error already shown)
        console.error("loadNextQuestion: Failed to load question data. Ending game.");
        // Ensure UI reflects game end state even if error happened during load
        if(gameAreaElement) gameAreaElement.style.display = 'none';
        if(resultAreaElement) resultAreaElement.style.display = 'block'; // Show results area (even if score is 0)
        // User status visibility handled by updateAuthStateUI
        if(finalScoreElement) finalScoreElement.textContent = currentScore;
    }
}


async function loadNewQuestion() {
    if (!supabaseClient) { showError("Database connection error."); return null; }
    if (selectedDifficulty === null) { showError("No difficulty selected."); return null; }

    // console.log(`Loading question (Difficulty: ${selectedDifficulty})...`); // Less verbose
    showLoading(); // <<<--- Call showLoading (which now has delay logic)
    hideError();

    try {
        // 1. Get the count of stickers for the selected difficulty
        const { count: stickerCount, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true }) // Just get the count
            .eq('difficulty', selectedDifficulty);

        if (countError) throw new Error(`Count Error: ${countError.message}`);
        if (stickerCount === null || stickerCount === 0) {
            throw new Error(`No stickers found for difficulty level ${selectedDifficulty}!`);
        }

        // 2. Get total club count (to ensure enough options) - could be cached if static
        const { count: totalClubCount, error: totalClubCountError } = await supabaseClient
            .from('clubs')
            .select('id', { count: 'exact', head: true });

        if (totalClubCountError) throw new Error(`Club Count Error: ${totalClubCountError.message}`);
        if (totalClubCount === null || totalClubCount < 4) { // Need at least 1 correct + 3 incorrect
            throw new Error(`Not enough clubs (${totalClubCount}) in the database to generate options!`);
        }

        // 3. Select a random sticker for the difficulty
        const randomIndex = Math.floor(Math.random() * stickerCount);
        const { data: randomStickerData, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`
                image_url,
                clubs ( id, name )
            `) // Select image_url and related club's id and name
            .eq('difficulty', selectedDifficulty)
            .order('id', { ascending: true }) // Consistent ordering needed for range()
            .range(randomIndex, randomIndex) // Fetch the single sticker at the random index
            .single(); // Expect exactly one result

        if (stickerError) {
            throw new Error(`Sticker fetch error: ${stickerError.message}`);
        }
        if (!randomStickerData || !randomStickerData.clubs) {
            throw new Error("Incomplete sticker or club data received.");
        }

        const correctClubId = randomStickerData.clubs.id;
        const correctClubName = randomStickerData.clubs.name;
        const imageUrl = randomStickerData.image_url;

        // 4. Fetch incorrect club names
        // *Optimization Note:* Fetching 50 is inefficient. See previous review comments.
        // Keeping original logic for now as requested.
        const { data: incorrectClubsData, error: incorrectClubsError } = await supabaseClient
            .from('clubs')
            .select('name')
            .neq('id', correctClubId) // Exclude the correct club
            .limit(50); // Fetch a pool of incorrect clubs

        if (incorrectClubsError) throw incorrectClubsError;
        if (!incorrectClubsData || incorrectClubsData.length < 3) {
            // Check if we got at least 3 incorrect clubs from the pool
            throw new Error("Not enough distinct incorrect clubs found to generate options.");
        }

        // 5. Process and shuffle options client-side
        const incorrectOptions = incorrectClubsData
            .map(club => club.name) // Get only names
            .filter(name => name !== correctClubName) // Ensure name is not same as correct (case-sensitive check)
            .sort(() => 0.5 - Math.random()) // Shuffle the pool
            .slice(0, 3); // Take the first 3

        if (incorrectOptions.length < 3) {
            // This might happen if limit(50) returned many clubs with the same name as the correct one
            throw new Error("Failed to select 3 distinct incorrect options after filtering.");
        }

        // 6. Combine correct and incorrect, shuffle final options
        const allOptions = [correctClubName, ...incorrectOptions].sort(() => 0.5 - Math.random());

        // 7. Prepare and return the question data object
        const questionDataForDisplay = {
            imageUrl: imageUrl,
            options: allOptions,
            correctAnswer: correctClubName
        };

        // hideLoading(); // <<<--- Moved to finally block
        return questionDataForDisplay;

    } catch (error) {
        console.error("Error loading new question:", error);
        showError(`Loading Error: ${error.message}`);
        // hideLoading(); // <<<--- Moved to finally block
        // Optionally end the game immediately on load failure
        setTimeout(endGame, 500);
        return null; // Return null to indicate failure
    } finally {
         hideLoading(); // <<<--- Ensure loading is hidden regardless of success/error
    }
}


function endGame() {
    console.log(`Game Over! Final Score: ${currentScore}`);
    stopTimer(); // Ensure timer is stopped

    // Update final score display
    if(finalScoreElement) finalScoreElement.textContent = currentScore;

    // Hide game area, show result area
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) {
        // Remove previous save message if exists
        const msg = resultAreaElement.querySelector('.save-message');
        if(msg) msg.remove();
        resultAreaElement.style.display = 'block';
    }

    // Hide difficulty selection (should be hidden, but ensure)
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';

    // Show user status again (handled by updateAuthStateUI called from closeLeaderboard or implicitly)

    // Attempt to save the score
    saveScore();
}


async function saveScore() {
    // Validate conditions for saving
    if (!currentUser) { console.log("Score not saved: User not logged in."); return; }
    if (typeof currentScore !== 'number' || currentScore < 0) { console.log("Score not saved: Invalid score."); return; }
    if (selectedDifficulty === null) { console.log("Score not saved: Difficulty not set."); return; }

    // Don't save scores of 0
    if (currentScore === 0) {
        console.log("Score is 0, not saving.");
        return;
    }

    console.log(`Attempting to save score: Score=${currentScore}, Difficulty=${selectedDifficulty}, User=${currentUser.id}`);
    showLoading(); // Show loading indicator (with delay) while saving

    let detectedCountryCode = null; // Initialize country code

    // --- GeoIP Fetch Block - Still Commented Out ---
    /* ... */
    // --- End of Commented Out GeoIP Block ---


    try {
        // console.log(`Saving score to database... (Country code: ${detectedCountryCode})`); // Less verbose
        const { error } = await supabaseClient
            .from('scores')
            .insert({
                user_id: currentUser.id,
                score: currentScore,
                difficulty: selectedDifficulty,
                country_code: detectedCountryCode
            });

        if (error) {
            console.error("Database error saving score:", error);
            throw error; // Throw to be caught by outer catch
        }

        console.log("Score saved successfully to database!");

        // Display confirmation message in the UI
        if (resultAreaElement && !resultAreaElement.querySelector('.save-message')) { // Avoid adding multiple messages
            const scoreSavedMessage = document.createElement('p');
            scoreSavedMessage.textContent = 'Your score has been saved!';
            scoreSavedMessage.className = 'save-message'; // Use class for styling
            // scoreSavedMessage.style.cssText = 'font-size: small; margin-top: 5px; color: green;'; // Rely on CSS class
            const p = resultAreaElement.querySelector('p');
            if(p) p.insertAdjacentElement('afterend', scoreSavedMessage);
            else resultAreaElement.appendChild(scoreSavedMessage); // Fallback append
        }

    } catch (error) {
        console.error("Error during score saving process:", error);
        showError(`Failed to save score: ${error.message}`);
         if(resultAreaElement) {
            const msg = resultAreaElement.querySelector('.save-message');
            if(msg) msg.remove();
         }
    } finally {
        hideLoading(); // Hide loading indicator regardless of outcome
    }
}



// ----- 10. Leaderboard Logic -----
// Calculate start/end dates for time filters (UTC)
function calculateTimeRange(timeframe) {
    const now = new Date();
    let fromDate = null; // Start date (inclusive)
    let toDate = null;   // End date (exclusive) - used only for 'today'

    switch (timeframe) {
        case 'today':
            const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const startOfNextDay = new Date(startOfDay);
            startOfNextDay.setUTCDate(startOfDay.getUTCDate() + 1);
            fromDate = startOfDay.toISOString();
            toDate = startOfNextDay.toISOString();
            break;
        case 'week':
            const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
            fromDate = sevenDaysAgo.toISOString();
            break;
        case 'month':
            const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30); // Approx. 1 month
            fromDate = thirtyDaysAgo.toISOString();
            break;
        case 'all':
        default:
            fromDate = null;
            toDate = null;
            break;
    }
    // console.log(`Time range for ${timeframe}: From ${fromDate}, To ${toDate}`); // Less verbose
    return { fromDate, toDate };
}


async function fetchLeaderboardData(timeframe, difficulty) {
    if (!supabaseClient) { showError("Database connection error."); return null; }
    console.log(`Workspaceing leaderboard data: Timeframe=${timeframe}, Difficulty=${difficulty}`);
    showLoading(); // <<<--- Call showLoading (with delay)
    hideError();

    try {
        const { fromDate, toDate } = calculateTimeRange(timeframe); // Get date range

        // Start building the query
        let query = supabaseClient
            .from('scores')
            .select(`
                score,
                created_at,
                profiles ( username )
            `) // Select score, timestamp, and related username from profiles table
            .eq('difficulty', difficulty); // Filter by selected difficulty

        // Apply time filters if needed
        if (fromDate) {
            query = query.gte('created_at', fromDate); // Greater than or equal to start date
        }
        if (toDate) {
            query = query.lt('created_at', toDate); // Less than end date
        }

        // Order results and limit
        query = query
            .order('score', { ascending: false }) // Highest score first
            .order('created_at', { ascending: true }) // Tie-break by earliest time
            .limit(10); // Get top 10 scores

        // Execute the query
        const { data, error } = await query;

        if (error) {
            console.error("Error fetching leaderboard data from Supabase:", error);
            throw error;
        }

        // console.log("Leaderboard data fetched successfully:", data); // Less verbose
        // hideLoading(); // <<<--- Moved to finally block
        return data; // Return the array of score entries

    } catch (error) {
        console.error("Error in fetchLeaderboardData:", error);
        showError(`Could not load leaderboard: ${error.message}`);
        // hideLoading(); // <<<--- Moved to finally block
        return null; // Return null on failure
    } finally {
        hideLoading(); // <<<--- Ensure loading is hidden regardless of success/error
    }
}


function displayLeaderboard(data) {
    if (!leaderboardListElement) {
        console.error("displayLeaderboard: leaderboardListElement not found.");
        return;
    }

    leaderboardListElement.innerHTML = ''; // Clear previous list items

    if (!data) {
        leaderboardListElement.innerHTML = '<li>Error loading data.</li>';
        return;
    }
    if (data.length === 0) {
        leaderboardListElement.innerHTML = '<li>No scores found for these filters.</li>';
        return;
    }

    // Create list items for each score entry
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        const username = entry.profiles?.username || 'Anonymous';
        // Use textContent for security
        // We rely on the ::before pseudo-element in CSS for the number
        const textNode = document.createTextNode(`${username} - ${entry.score}`);
        li.appendChild(textNode);
        leaderboardListElement.appendChild(li);
    });
}


// Update UI for active/inactive filter buttons
function updateFilterButtonsUI() {
    // Time filters
    leaderboardTimeFilterButtons?.forEach(btn => {
        const isActive = btn.dataset.timeframe === currentLeaderboardTimeframe;
        btn.classList.toggle('active', isActive); // Add/remove 'active' class
        btn.disabled = isActive; // Disable the active button
    });
    // Difficulty filters
    leaderboardDifficultyFilterButtons?.forEach(btn => {
        const btnDifficulty = parseInt(btn.dataset.difficulty, 10);
        const isActive = btnDifficulty === currentLeaderboardDifficulty;
        btn.classList.toggle('active', isActive);
        btn.disabled = isActive;
    });
}

// Fetch and display leaderboard based on current filter state
async function updateLeaderboard() {
    if (!leaderboardListElement) { return; }

    // Show loading state in the list
    leaderboardListElement.innerHTML = '<li>Loading...</li>';

    // Update button states (active/disabled)
    updateFilterButtonsUI();

    // Fetch new data based on current global filters
    const data = await fetchLeaderboardData(currentLeaderboardTimeframe, currentLeaderboardDifficulty);

    // Display the fetched data (or error/no results message)
    displayLeaderboard(data);
}

// Event handler for time filter button clicks
function handleTimeFilterChange(event) {
    const button = event.currentTarget;
    const newTimeframe = button.dataset.timeframe;

    if (newTimeframe && newTimeframe !== currentLeaderboardTimeframe) {
        currentLeaderboardTimeframe = newTimeframe;
        // console.log("Leaderboard time filter changed to:", newTimeframe); // Less verbose
        updateLeaderboard();
    }
}

// Event handler for difficulty filter button clicks
function handleDifficultyFilterChange(event) {
    const button = event.currentTarget;
    const newDifficulty = parseInt(button.dataset.difficulty, 10);

    if (newDifficulty && !isNaN(newDifficulty) && newDifficulty !== currentLeaderboardDifficulty) {
        currentLeaderboardDifficulty = newDifficulty;
        // console.log("Leaderboard difficulty filter changed to:", newDifficulty); // Less verbose
        updateLeaderboard();
    }
}


// Show the leaderboard section
function openLeaderboard() {
    console.log("Opening leaderboard..."); hideError();

     // We assume elements are initialized by initializeApp
     if (!leaderboardSectionElement || !gameAreaElement || !resultAreaElement || !difficultySelectionElement ) {
         console.error("Cannot open leaderboard, core elements missing.");
         handleCriticalError("UI Error opening leaderboard."); return;
     }


    // Hide other main views
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if(difficultySelectionElement) difficultySelectionElement.style.display = 'none';

    // Auth section visibility is handled by header styles / updateAuthStateUI

    // Show the leaderboard section
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'block';

    // Fetch and display the latest leaderboard data
    updateLeaderboard();
}

// Hide the leaderboard section and restore appropriate view
function closeLeaderboard() {
    console.log("Closing leaderboard...");
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none';

    // Restore the correct UI state based on whether user is logged in/out
    updateAuthStateUI(currentUser);
}


// ----- 11. Helper Functions -----
function showError(message) {
    console.error("Game Error:", message); // Log error to console
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block'; // Make error visible
    } else {
        alert(`Error: ${message}`);
    }
}

function hideError() {
    if (errorMessageElement) {
        errorMessageElement.style.display = 'none'; // Hide error element
        errorMessageElement.textContent = ''; // Clear text
    }
}

// Used for critical errors where the app cannot recover
function handleCriticalError(message) {
    console.error("Critical Error:", message);
    stopTimer();
    // Replace page content with an error message
    document.body.innerHTML = `<h1>Application Error</h1><p>${message}</p><p>Please try refreshing the page. If the problem persists, contact support.</p>`;
}

// --- Updated Loading Indicator Logic ---
function showLoading() {
    // Clear any pending timer to prevent showing loading if hideLoading is called quickly
    if (loadingTimerId) {
        clearTimeout(loadingTimerId);
        loadingTimerId = null;
    }
    // Set a timer to show loading only after a short delay (e.g., 300ms)
    loadingTimerId = setTimeout(() => {
        // console.log("Loading indicator: Show (delayed)"); // Less verbose
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        loadingTimerId = null; // Clear the ID after execution
    }, 300); // 300ms delay
}

function hideLoading() {
    // Clear the timer if it hasn't executed yet (prevents indicator from showing)
    if (loadingTimerId) {
        clearTimeout(loadingTimerId);
        loadingTimerId = null;
        // console.log("Loading indicator: Hide (timer cleared before show)"); // Less verbose
    }
    // Always hide the indicator immediately if it's already visible
    // console.log("Loading indicator: Hide (immediate)"); // Less verbose
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}


// ----- 12. App Initialization -----
function initializeApp() {
    console.log("DOM fully loaded, initializing application...");

    // Find elements and add listeners. Crucial step.
    if (!initializeDOMElements()) {
        console.error("CRITICAL: Failed to initialize DOM elements. Application cannot start.");
        return; // Stop initialization
    }

    // Set up the listener for authentication changes *after* elements are ready
    setupAuthStateChangeListener();

    // Manually update the UI based on the *initial* auth state checked earlier
    updateAuthStateUI(currentUser);

    console.log("Application initialized. Current user state:", currentUser ? currentUser.id : 'Logged out');

    // Ensure initial view state is correct (hide game/results/leaderboard, show necessary buttons)
    if(gameAreaElement) gameAreaElement.style.display = 'none';
    if(resultAreaElement) resultAreaElement.style.display = 'none';
    if (leaderboardSectionElement) leaderboardSectionElement.style.display = 'none'; // Ensure leaderboard hidden initially

    console.log("App ready. Waiting for user actions or auth changes.");
}

// Initial setup logic is now triggered by the DOMContentLoaded listener or directly if DOM is ready
// in the Supabase initialization block (Section 2).
