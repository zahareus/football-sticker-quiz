// stickerlog.js - Sticker Log page functionality
// Displays chronological history of all stickers added to the catalogue

let supabaseClient;

// Auth state
let currentUser = null;
let currentUserProfile = null;

// Edit nickname form elements
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Pagination state
const STICKERS_PER_PAGE = 100;
let currentPage = 1;
let allStickers = [];
let groupedStickers = {};

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before stickerlog.js');
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.innerHTML = "<p>Initialization error. Sticker log cannot be loaded.</p>";
    }
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (supabaseClient) {
        // Setup auth
        setupAuth();

        // Initialize nickname editing elements
        editNicknameForm = document.getElementById('edit-nickname-form');
        nicknameInputElement = document.getElementById('nickname-input');
        cancelEditNicknameButton = document.getElementById('cancel-edit-nickname-button');
        setupNicknameEditing();

        // Check for page parameter in URL
        const params = new URLSearchParams(window.location.search);
        const pageParam = params.get('page');
        if (pageParam) {
            const pageNum = parseInt(pageParam, 10);
            if (!isNaN(pageNum) && pageNum > 0) {
                currentPage = pageNum;
            }
        }

        // Load stickers
        await loadAllStickers();
    } else {
        console.error('Supabase client failed to initialize. Sticker log functionality will be limited.');
        const loadingDiv = document.getElementById('loading-indicator');
        if (loadingDiv) {
            loadingDiv.innerHTML = "<p>Initialization error. Sticker log cannot be loaded.</p>";
        }
    }
});

/**
 * Load all stickers from the database
 */
async function loadAllStickers() {
    const loadingDiv = document.getElementById('loading-indicator');
    const contentDiv = document.getElementById('stickerlog-content');
    const paginationDiv = document.getElementById('pagination-controls');

    if (!supabaseClient) {
        loadingDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }

    try {
        // Fetch all stickers with club information
        // Order by created_at descending (newest first)
        const { data: stickers, error: stickersError } = await supabaseClient
            .from('stickers')
            .select(`
                id,
                created_at,
                found,
                location,
                clubs (
                    id,
                    name,
                    country
                )
            `)
            .order('created_at', { ascending: false });

        if (stickersError) {
            console.error('Error fetching stickers:', stickersError);
            loadingDiv.innerHTML = `<p>Could not load stickers: ${stickersError.message}</p>`;
            return;
        }

        if (!stickers || stickers.length === 0) {
            loadingDiv.innerHTML = '<p>No stickers found in the catalogue.</p>';
            return;
        }

        allStickers = stickers;

        // Group stickers by date added (created_at date, not hunted date)
        groupedStickers = groupStickersByDate(stickers);

        // Display stickers for current page
        displayStickers();

        // Show content and hide loading
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        paginationDiv.style.display = 'block';

    } catch (error) {
        console.error('An error occurred while loading stickers:', error);
        loadingDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

/**
 * Group stickers by their created_at date
 * @param {Array} stickers - Array of sticker objects
 * @returns {Object} - Object with dates as keys and arrays of stickers as values
 */
function groupStickersByDate(stickers) {
    const grouped = {};

    stickers.forEach(sticker => {
        if (!sticker.created_at) return;

        // Extract date without time (YYYY-MM-DD)
        const dateObj = new Date(sticker.created_at);
        const dateKey = dateObj.toISOString().split('T')[0];

        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }

        grouped[dateKey].push(sticker);
    });

    return grouped;
}

/**
 * Display stickers for the current page
 */
function displayStickers() {
    const contentDiv = document.getElementById('stickerlog-content');
    const paginationDiv = document.getElementById('pagination-controls');

    if (!contentDiv) return;

    // Flatten grouped stickers into a single array while preserving order
    const flatStickers = [];
    const sortedDates = Object.keys(groupedStickers).sort((a, b) => b.localeCompare(a)); // Newest first

    sortedDates.forEach(date => {
        groupedStickers[date].forEach(sticker => {
            flatStickers.push({ date, sticker });
        });
    });

    // Calculate pagination
    const totalStickers = flatStickers.length;
    const totalPages = Math.ceil(totalStickers / STICKERS_PER_PAGE);
    const startIndex = (currentPage - 1) * STICKERS_PER_PAGE;
    const endIndex = Math.min(startIndex + STICKERS_PER_PAGE, totalStickers);
    const stickersToDisplay = flatStickers.slice(startIndex, endIndex);

    // Build HTML
    let html = '';
    let currentDisplayDate = null;

    stickersToDisplay.forEach(({ date, sticker }) => {
        // Add date header if this is a new date group
        if (currentDisplayDate !== date) {
            // Close previous list if exists
            if (currentDisplayDate !== null) {
                html += `</ul>`;
            }

            currentDisplayDate = date;
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            html += `<div class="stickerlog-date-header">
                <h2>${formattedDate}</h2>
            </div>`;
            html += `<ul class="stickerlog-entries-list">`;
        }

        // Format sticker entry
        const stickerEntry = formatStickerEntry(sticker);
        html += `<li class="stickerlog-entry">${stickerEntry}</li>`;
    });

    // Close the last list
    if (currentDisplayDate !== null) {
        html += `</ul>`;
    }

    contentDiv.innerHTML = html;

    // Display pagination controls
    displayPaginationControls(totalPages, totalStickers, startIndex + 1, endIndex);
}

/**
 * Format a single sticker entry
 * Format: #2866, FK Austria Viena.
 * @param {Object} sticker - Sticker object
 * @returns {string} - Formatted HTML string
 */
function formatStickerEntry(sticker) {
    const stickerId = sticker.id;
    const clubName = sticker.clubs ? sticker.clubs.name : 'Unknown Club';
    const clubId = sticker.clubs ? sticker.clubs.id : null;

    // Build the entry with links
    // Format: #2866, FK Austria Viena.
    let entry = '<a href="/stickers/' + stickerId + '.html" class="sticker-link">#' + stickerId + '</a>, ';

    if (clubId) {
        entry += '<a href="/clubs/' + clubId + '.html" class="club-link">' + clubName + '</a>';
    } else {
        entry += clubName;
    }

    entry += '.';

    return entry;
}

/**
 * Display pagination controls
 * @param {number} totalPages - Total number of pages
 * @param {number} totalStickers - Total number of stickers
 * @param {number} startNum - Starting sticker number on current page
 * @param {number} endNum - Ending sticker number on current page
 */
function displayPaginationControls(totalPages, totalStickers, startNum, endNum) {
    const paginationDiv = document.getElementById('pagination-controls');
    if (!paginationDiv) return;

    let html = '<div class="pagination-wrapper">';

    // Info text
    html += `<div class="pagination-info">Showing ${startNum}-${endNum} of ${totalStickers} stickers</div>`;

    // Pagination buttons
    html += '<div class="pagination-buttons">';

    // Previous button
    if (currentPage > 1) {
        html += `<a href="?page=${currentPage - 1}" class="pagination-btn">← Previous</a>`;
    } else {
        html += `<span class="pagination-btn pagination-btn-disabled">← Previous</span>`;
    }

    // Page numbers
    const maxPagesToShow = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    // First page
    if (startPage > 1) {
        html += `<a href="?page=1" class="pagination-btn">1</a>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<span class="pagination-btn pagination-btn-active">${i}</span>`;
        } else {
            html += `<a href="?page=${i}" class="pagination-btn">${i}</a>`;
        }
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<a href="?page=${totalPages}" class="pagination-btn">${totalPages}</a>`;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?page=${currentPage + 1}" class="pagination-btn">Next →</a>`;
    } else {
        html += `<span class="pagination-btn pagination-btn-disabled">Next →</span>`;
    }

    html += '</div>'; // Close pagination-buttons
    html += '</div>'; // Close pagination-wrapper

    paginationDiv.innerHTML = html;
}

// ========== AUTH FUNCTIONS ==========

// Load user profile
async function loadAndSetUserProfile(user) {
    if (!supabaseClient || !user) return;

    const profile = await SharedUtils.loadUserProfile(supabaseClient, user);
    if (profile) {
        currentUserProfile = profile;
        SharedUtils.cacheUserProfile(profile);
    }
}

// Update auth UI
function updateAuthUI(user) {
    const loginButton = document.getElementById('login-button');
    const userStatusElement = document.getElementById('user-status');
    const userNicknameElement = document.getElementById('user-nickname');

    if (!loginButton || !userStatusElement || !userNicknameElement) return;

    if (user) {
        const displayName = currentUserProfile?.username || 'Loading...';
        userNicknameElement.textContent = SharedUtils.truncateString(displayName);
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'flex';
    } else {
        loginButton.style.display = 'none';
        userStatusElement.style.display = 'none';
    }
}

// Login with Google
function handleLoginClick() {
    if (!supabaseClient) return;
    SharedUtils.loginWithGoogle(supabaseClient, '/stickerlog.html').then(result => {
        if (result.error) {
            alert('Login failed. Please try again.');
        }
    });
}

// Logout
async function handleLogoutClick() {
    if (!supabaseClient) return;

    const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
    if (result.error) {
        alert('Logout failed. Please try again.');
    } else {
        window.location.reload();
    }
}

/**
 * Setup auth
 */
function setupAuth() {
    if (!supabaseClient) return;

    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // Set up button handlers
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
    }

    // Get current session
    supabaseClient.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error) {
            console.error('Error getting session:', error);
            updateAuthUI(null);
            setupAuthStateListener();
            return;
        }

        const user = session?.user ?? null;

        if (user) {
            currentUser = user;

            // Load cached profile first for fast UI
            const cachedProfile = SharedUtils.loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                updateAuthUI(user);
            }

            // Load fresh profile and update UI
            await loadAndSetUserProfile(user);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }

        // Set up listener for future auth changes only
        setupAuthStateListener();
    });
}

/**
 * Auth state listener
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // Skip INITIAL_SESSION
        if (event === 'INITIAL_SESSION') {
            return;
        }

        const user = session?.user ?? null;

        // Handle logout
        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                SharedUtils.clearCachedProfile(currentUser.id);
            }
            currentUser = null;
            currentUserProfile = null;
            updateAuthUI(null);
            return;
        }

        // Handle new sign in
        if (event === 'SIGNED_IN' && user) {
            if (!currentUser || currentUser.id !== user.id) {
                currentUser = user;
                const cachedProfile = SharedUtils.loadCachedProfile(user.id);
                if (cachedProfile) {
                    currentUserProfile = cachedProfile;
                }
                updateAuthUI(user);
                await loadAndSetUserProfile(user);
                updateAuthUI(user);
            }
        }

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && user) {
            currentUser = user;
        }
    });
}

// ========== NICKNAME EDITING FUNCTIONS ==========

function setupNicknameEditing() {
    const userNicknameElement = document.getElementById('user-nickname');
    if (!userNicknameElement) return;

    userNicknameElement.addEventListener('click', showNicknameEditForm);

    if (editNicknameForm) {
        editNicknameForm.addEventListener('submit', handleNicknameSave);
    }
    if (cancelEditNicknameButton) {
        cancelEditNicknameButton.addEventListener('click', hideNicknameEditForm);
    }
}

function showNicknameEditForm() {
    if (!currentUserProfile) {
        alert('Please wait for your profile to load...');
        return;
    }

    if (!editNicknameForm || !nicknameInputElement) return;

    nicknameInputElement.value = currentUserProfile.username || '';
    editNicknameForm.style.display = 'block';
    nicknameInputElement.focus();
    nicknameInputElement.select();
}

function hideNicknameEditForm() {
    if (!editNicknameForm || !nicknameInputElement) return;
    editNicknameForm.style.display = 'none';
    nicknameInputElement.value = '';
}

async function handleNicknameSave(event) {
    event.preventDefault();

    if (!currentUser || !nicknameInputElement || !supabaseClient || !currentUserProfile) {
        alert('Cannot save nickname');
        return;
    }

    const newNickname = nicknameInputElement.value.trim();

    if (newNickname === currentUserProfile.username) {
        hideNicknameEditForm();
        return;
    }

    const result = await SharedUtils.updateNickname(supabaseClient, currentUser.id, newNickname);

    if (result.error) {
        alert(`Update failed: ${result.error.message}`);
    } else {
        currentUserProfile.username = result.data.username;
        SharedUtils.cacheUserProfile(currentUserProfile);

        const userNicknameElement = document.getElementById('user-nickname');
        if (userNicknameElement) {
            userNicknameElement.textContent = SharedUtils.truncateString(result.data.username);
        }

        hideNicknameEditForm();
        alert('Nickname updated successfully!');
    }
}
