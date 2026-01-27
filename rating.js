// rating.js - Rating page functionality

let supabaseClient;
let currentPage = 1;
let totalStickers = 0;
const STICKERS_PER_PAGE_MOBILE = 100;
const STICKERS_PER_PAGE_DESKTOP = 200;

// Auth state
let currentUser = null;
let currentUserProfile = null;

// Edit nickname form elements
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before rating.js');
    const contentDiv = document.getElementById('rating-content');
    if (contentDiv) {
        contentDiv.innerHTML = "<p>Initialization error. Rating cannot be loaded.</p>";
    }
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
}

// Detect if desktop (2 columns) or mobile (1 column)
function isDesktop() {
    return window.innerWidth >= 900;
}

// Get stickers per page based on screen size
function getStickersPerPage() {
    return isDesktop() ? STICKERS_PER_PAGE_DESKTOP : STICKERS_PER_PAGE_MOBILE;
}

// Get columns count based on screen size
function getColumnsCount() {
    return isDesktop() ? 2 : 1;
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

        // Get page from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        if (pageParam && !isNaN(pageParam) && parseInt(pageParam) > 0) {
            currentPage = parseInt(pageParam);
        }

        await loadRatingData();

        // Reload on window resize to adjust columns
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                loadRatingData();
            }, 250);
        });
    } else {
        console.error('Supabase client failed to initialize.');
        const contentDiv = document.getElementById('rating-content');
        if (contentDiv) contentDiv.innerHTML = "<p>Initialization error. Rating cannot be loaded.</p>";
    }
});

async function loadRatingData() {
    const contentDiv = document.getElementById('rating-content');
    const paginationDiv = document.getElementById('rating-pagination');

    contentDiv.innerHTML = '<p>Loading ratings...</p>';
    paginationDiv.style.display = 'none';

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Cannot load ratings.</p>';
        return;
    }

    try {
        // Get total count of stickers
        const { count, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.error('Error fetching sticker count:', countError);
            contentDiv.innerHTML = `<p>Could not load ratings: ${countError.message}</p>`;
            return;
        }

        totalStickers = count || 0;
        const stickersPerPage = getStickersPerPage();
        const totalPages = Math.ceil(totalStickers / stickersPerPage);

        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }

        const offset = (currentPage - 1) * stickersPerPage;

        // Fetch stickers for current page
        const { data: stickers, error: stickersError } = await supabaseClient
            .from('stickers')
            .select(`
                id,
                rating,
                clubs (
                    id,
                    name,
                    country
                )
            `)
            .order('rating', { ascending: false })
            .range(offset, offset + stickersPerPage - 1);

        if (stickersError) {
            console.error('Error fetching stickers:', stickersError);
            contentDiv.innerHTML = `<p>Could not load ratings: ${stickersError.message}</p>`;
            return;
        }

        if (!stickers || stickers.length === 0) {
            contentDiv.innerHTML = '<p>No stickers found.</p>';
            return;
        }

        // Build rating table HTML
        const columnsCount = getColumnsCount();
        const stickersPerColumn = Math.ceil(stickers.length / columnsCount);

        let html = '<div class="rating-table-container">';

        // Create columns
        for (let col = 0; col < columnsCount; col++) {
            const startIdx = col * stickersPerColumn;
            const endIdx = Math.min(startIdx + stickersPerColumn, stickers.length);
            const columnStickers = stickers.slice(startIdx, endIdx);

            if (columnStickers.length === 0) continue;

            html += '<div class="rating-column">';
            html += '<table class="rating-table">';
            html += '<tbody>';

            columnStickers.forEach((sticker, idx) => {
                const globalRank = offset + startIdx + idx + 1;
                const clubName = sticker.clubs?.name || 'Unknown Club';
                const clubId = sticker.clubs?.id || null;
                const rating = sticker.rating || 1500;

                html += '<tr>';
                html += `<td class="rank-cell">${globalRank}.</td>`;
                html += `<td class="sticker-cell"><a href="/stickers/${sticker.id}.html">${sticker.id}</a></td>`;
                html += '<td class="club-cell">';
                if (clubId) {
                    html += `<a href="/clubs/${clubId}.html">${clubName}</a>`;
                } else {
                    html += clubName;
                }
                html += '</td>';
                html += `<td class="rating-cell">${rating}</td>`;
                html += '</tr>';
            });

            html += '</tbody>';
            html += '</table>';
            html += '</div>';
        }

        html += '</div>';

        contentDiv.innerHTML = html;

        // Build pagination
        if (totalPages > 1) {
            renderPagination(totalPages);
            paginationDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('An error occurred while loading ratings:', error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

function renderPagination(totalPages) {
    const paginationDiv = document.getElementById('rating-pagination');
    let html = '<div class="pagination">';

    // Previous button
    if (currentPage > 1) {
        html += `<a href="?page=${currentPage - 1}" class="pagination-btn" onclick="goToPage(${currentPage - 1}); return false;">← Previous</a>`;
    } else {
        html += '<span class="pagination-btn disabled">← Previous</span>';
    }

    // Page numbers
    html += '<span class="pagination-info">Page ' + currentPage + ' of ' + totalPages + '</span>';

    // Next button
    if (currentPage < totalPages) {
        html += `<a href="?page=${currentPage + 1}" class="pagination-btn" onclick="goToPage(${currentPage + 1}); return false;">Next →</a>`;
    } else {
        html += '<span class="pagination-btn disabled">Next →</span>';
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    window.scrollTo(0, 0);
    loadRatingData();

    // Update URL without reloading page
    const newUrl = window.location.pathname + '?page=' + page;
    window.history.pushState({page: page}, '', newUrl);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.page) {
        currentPage = event.state.page;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        currentPage = pageParam && !isNaN(pageParam) ? parseInt(pageParam) : 1;
    }
    loadRatingData();
});

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
    SharedUtils.loginWithGoogle(supabaseClient, '/rating.html').then(result => {
        if (result.error) {
            alert('Login failed. Please try again.');
        }
    });
}

// Logout
async function handleLogoutClick() {
    if (!supabaseClient) {
        console.error('Logout failed: supabaseClient is null');
        return;
    }

    try {
        const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
        if (result.error) {
            alert('Logout failed. Please try again.');
        } else {
            window.location.reload();
        }
    } catch (err) {
        console.error('Logout exception:', err);
        alert('Logout error: ' + err.message);
    }
}

function setupAuth() {
    if (!supabaseClient) return;

    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
    }

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

            const cachedProfile = SharedUtils.loadCachedProfile(user.id);
            if (cachedProfile) {
                currentUserProfile = cachedProfile;
                updateAuthUI(user);
            }

            await loadAndSetUserProfile(user);
            SharedUtils.identifyAmplitudeUser(user, currentUserProfile);
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }

        setupAuthStateListener();
    });
}

function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
            return;
        }

        const user = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                SharedUtils.clearCachedProfile(currentUser.id);
            }
            currentUser = null;
            currentUserProfile = null;
            SharedUtils.clearAmplitudeUser();
            updateAuthUI(null);
            return;
        }

        if (event === 'SIGNED_IN' && user) {
            if (!currentUser || currentUser.id !== user.id) {
                currentUser = user;
                const cachedProfile = SharedUtils.loadCachedProfile(user.id);
                if (cachedProfile) {
                    currentUserProfile = cachedProfile;
                }
                updateAuthUI(user);
                await loadAndSetUserProfile(user);
                SharedUtils.identifyAmplitudeUser(user, currentUserProfile);
                updateAuthUI(user);
            }
        }

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
