// map.js - Global map page functionality

let supabaseClient;

// Auth state
let currentUser = null;
let currentUserProfile = null;

// Edit nickname form elements
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before map.js');
    const mapContainer = document.getElementById('global-map');
    if (mapContainer) {
        mapContainer.innerHTML = "<p>Initialization error. Map cannot be loaded.</p>";
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

        await initializeGlobalMap();
    } else {
        console.error('Supabase client failed to initialize.');
    }
});

/**
 * Fetch all stickers with coordinates
 * @returns {Promise<Array>} - Array of stickers with coordinates
 */
async function fetchAllGeoStickers() {
    if (!supabaseClient) return [];

    try {
        const { data, error } = await supabaseClient
            .from('stickers')
            .select(`
                id,
                latitude,
                longitude,
                clubs (name)
            `)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching geo stickers:', error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error('Error in fetchAllGeoStickers:', e);
        return [];
    }
}

/**
 * Initialize the global map with all stickers
 */
async function initializeGlobalMap() {
    const mapContainer = document.getElementById('global-map');
    const countElement = document.getElementById('geo-sticker-count');

    if (!mapContainer) {
        console.error('Global map container not found');
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        mapContainer.innerHTML = '<p style="text-align: center; color: var(--color-info-text);">Map could not be loaded</p>';
        return;
    }

    // Show loading state
    mapContainer.innerHTML = '<p style="text-align: center; padding: 100px 0; color: var(--color-info-text);">Loading map...</p>';

    // Fetch all stickers with coordinates
    const stickers = await fetchAllGeoStickers();

    // Update sticker count
    if (countElement) {
        countElement.textContent = stickers.length;
    }

    // Clear loading state
    mapContainer.innerHTML = '';

    // Initialize the map centered on Europe
    const map = L.map('global-map', {
        scrollWheelZoom: false
    }).setView([50.0, 10.0], 4); // Center on Europe

    // Add CartoDB Voyager tiles (English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Create inactive icon for stickers
    const inactiveIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [20, 33],
        iconAnchor: [10, 33],
        popupAnchor: [1, -28],
        shadowSize: [33, 33],
        className: 'inactive-marker'
    });

    // Add markers for all stickers
    if (stickers && stickers.length > 0) {
        stickers.forEach(sticker => {
            if (sticker.latitude && sticker.longitude) {
                const clubName = sticker.clubs ? sticker.clubs.name : 'Unknown Club';
                const popupContent = `
                    <div class="nearby-sticker-popup">
                        <strong>${clubName}</strong>
                        <a href="/stickers/${sticker.id}.html" class="map-popup-link">View</a>
                    </div>
                `;

                const marker = L.marker([sticker.latitude, sticker.longitude], {
                    icon: inactiveIcon
                }).addTo(map);

                marker.bindPopup(popupContent);

                // Show popup on hover (desktop) and click (mobile)
                marker.on('mouseover', function() {
                    this.openPopup();
                });
                marker.on('click', function() {
                    this.openPopup();
                });
            }
        });
    }

    // Enable scroll zoom only when map is clicked
    map.on('click', function() {
        map.scrollWheelZoom.enable();
    });

    // Disable scroll zoom when mouse leaves map
    mapContainer.addEventListener('mouseleave', function() {
        map.scrollWheelZoom.disable();
    });
}

// ========== AUTH FUNCTIONS ==========

async function loadAndSetUserProfile(user) {
    if (!supabaseClient || !user) return;

    const profile = await SharedUtils.loadUserProfile(supabaseClient, user);
    if (profile) {
        currentUserProfile = profile;
        SharedUtils.cacheUserProfile(profile);
    }
}

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

function handleLoginClick() {
    if (!supabaseClient) return;
    SharedUtils.loginWithGoogle(supabaseClient, '/map.html').then(result => {
        if (result.error) {
            alert('Login failed. Please try again.');
        }
    });
}

async function handleLogoutClick() {
    if (!supabaseClient) return;

    const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
    if (result.error) {
        alert('Logout failed. Please try again.');
    } else {
        window.location.reload();
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
            SharedUtils.identifyAmplitudeUser(user, currentUserProfile); // Identify in Amplitude
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
            SharedUtils.clearAmplitudeUser(); // Clear Amplitude user
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
            SharedUtils.identifyAmplitudeUser(user, currentUserProfile); // Identify in Amplitude
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
