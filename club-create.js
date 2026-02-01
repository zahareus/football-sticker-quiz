// club-create.js - Club creation functionality

// ============================================================
// CONFIGURATION
// ============================================================

const CLUB_CREATE_CONFIG = {
    // OpenAI API key for enrichment - loaded from environment or config
    // For production, this should be moved to a backend API endpoint
    OPENAI_API_KEY: window.OPENAI_API_KEY || '',

    // Debounce delay for search (ms)
    SEARCH_DEBOUNCE: 300,

    // Maximum suggestions to show
    MAX_SUGGESTIONS: 10,

    // OpenAI retry settings
    OPENAI_RETRIES: 2,
    OPENAI_RETRY_DELAY: 500
};

// ============================================================
// STATE
// ============================================================

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let allClubs = [];
let uniqueCountries = [];
let searchTimeout = null;
let countrySearchTimeout = null;

// ============================================================
// DOM ELEMENTS
// ============================================================

const elements = {
    loadingState: null,
    accessDenied: null,
    createFormContainer: null,
    createForm: null,
    clubNameInput: null,
    suggestionsList: null,
    countryCodeInput: null,
    countrySuggestionsList: null,
    autoEnrichCheckbox: null,
    manualFields: null,
    clubCityInput: null,
    clubMediaInput: null,
    clubWebInput: null,
    submitBtn: null,
    progressLog: null,
    statusMessage: null,
    resultCard: null,
    resultDetails: null,
    viewClubBtn: null,
    createAnotherBtn: null,
    loginButton: null,
    userStatus: null,
    userNickname: null,
    logoutButton: null
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    initElements();
    supabaseClient = SharedUtils.initSupabaseClient();

    if (!supabaseClient) {
        showStatus('Error initializing application', 'error');
        return;
    }

    await checkAuthAndPermissions();
    setupEventListeners();
});

function initElements() {
    elements.loadingState = document.getElementById('loading-state');
    elements.accessDenied = document.getElementById('access-denied');
    elements.createFormContainer = document.getElementById('create-form-container');
    elements.createForm = document.getElementById('create-form');
    elements.clubNameInput = document.getElementById('club-name');
    elements.suggestionsList = document.getElementById('suggestions-list');
    elements.countryCodeInput = document.getElementById('country-code');
    elements.countrySuggestionsList = document.getElementById('country-suggestions-list');
    elements.autoEnrichCheckbox = document.getElementById('auto-enrich');
    elements.manualFields = document.getElementById('manual-fields');
    elements.clubCityInput = document.getElementById('club-city');
    elements.clubMediaInput = document.getElementById('club-media');
    elements.clubWebInput = document.getElementById('club-web');
    elements.submitBtn = document.getElementById('submit-btn');
    elements.progressLog = document.getElementById('progress-log');
    elements.statusMessage = document.getElementById('status-message');
    elements.resultCard = document.getElementById('result-card');
    elements.resultDetails = document.getElementById('result-details');
    elements.viewClubBtn = document.getElementById('view-club-btn');
    elements.createAnotherBtn = document.getElementById('create-another-btn');
    elements.loginButton = document.getElementById('login-button');
    elements.userStatus = document.getElementById('user-status');
    elements.userNickname = document.getElementById('user-nickname');
    elements.logoutButton = document.getElementById('logout-button');
}

// ============================================================
// AUTHENTICATION & PERMISSIONS
// ============================================================

async function checkAuthAndPermissions() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            showAccessDenied('Please sign in to create clubs.');
            setupLoginButton();
            return;
        }

        currentUser = session.user;

        // Load profile with can_upload permission (same as upload page)
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('id, username, can_upload')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.error('Error loading profile:', error);
            showAccessDenied('Error loading profile. Please try again.');
            return;
        }

        currentProfile = profile;
        updateAuthUI();

        // Check upload permission (can_upload also means can create clubs)
        if (!profile.can_upload) {
            showAccessDenied('You don\'t have permission to create clubs.');
            return;
        }

        // Load clubs and show form
        await loadClubs();
        showCreateForm();

    } catch (error) {
        console.error('Auth check error:', error);
        showAccessDenied('Error checking permissions. Please try again.');
    }
}

function setupLoginButton() {
    if (elements.loginButton) {
        elements.loginButton.style.display = 'inline-flex';
        elements.loginButton.addEventListener('click', async () => {
            await SharedUtils.loginWithGoogle(supabaseClient, '/club-create.html');
        });
    }
}

function updateAuthUI() {
    if (currentUser && currentProfile) {
        if (elements.loginButton) elements.loginButton.style.display = 'none';
        if (elements.userStatus) elements.userStatus.style.display = 'flex';
        if (elements.userNickname) {
            elements.userNickname.textContent = SharedUtils.truncateString(currentProfile.username);
        }
    }
}

function showAccessDenied(message) {
    elements.loadingState.style.display = 'none';
    elements.accessDenied.style.display = 'block';
    if (message) {
        elements.accessDenied.querySelector('p').textContent = message;
    }
}

function showCreateForm() {
    elements.loadingState.style.display = 'none';
    elements.createFormContainer.style.display = 'block';
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadClubs() {
    try {
        const { data, error } = await supabaseClient
            .from('clubs')
            .select('id, name, country')
            .order('name');

        if (error) throw error;
        allClubs = data || [];

        // Extract unique country codes
        const countrySet = new Set(allClubs.map(club => club.country).filter(Boolean));
        uniqueCountries = [...countrySet].sort();

        console.log(`Loaded ${allClubs.length} clubs, ${uniqueCountries.length} countries`);
    } catch (error) {
        console.error('Error loading clubs:', error);
        showStatus('Error loading clubs list', 'error');
    }
}

// ============================================================
// AUTOCOMPLETE & SUGGESTIONS
// ============================================================

function searchClubs(query) {
    if (!query || query.length < 2) {
        hideSuggestions();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = allClubs
        .filter(club => club.name.toLowerCase().includes(lowerQuery))
        .slice(0, CLUB_CREATE_CONFIG.MAX_SUGGESTIONS);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    showSuggestions(matches);
}

function showSuggestions(matches) {
    elements.suggestionsList.innerHTML = matches.map((club, index) => `
        <li class="suggestion-item existing-club" data-id="${club.id}" data-name="${escapeHtml(club.name)}" data-index="${index}">
            ${escapeHtml(club.name)}
            <span class="suggestion-country">${escapeHtml(club.country || '')} - Already exists</span>
        </li>
    `).join('');

    elements.suggestionsList.classList.add('visible');
}

function hideSuggestions() {
    elements.suggestionsList.classList.remove('visible');
    elements.suggestionsList.innerHTML = '';
}

function searchCountries(query) {
    if (!query) {
        hideCountrySuggestions();
        return;
    }

    const upperQuery = query.toUpperCase();
    const matches = uniqueCountries
        .filter(country => country.toUpperCase().includes(upperQuery))
        .slice(0, CLUB_CREATE_CONFIG.MAX_SUGGESTIONS);

    if (matches.length === 0) {
        hideCountrySuggestions();
        return;
    }

    showCountrySuggestions(matches);
}

function showCountrySuggestions(matches) {
    elements.countrySuggestionsList.innerHTML = matches.map((country, index) => `
        <li class="suggestion-item" data-code="${country}" data-index="${index}">
            ${escapeHtml(country)}
        </li>
    `).join('');

    elements.countrySuggestionsList.classList.add('visible');
}

function hideCountrySuggestions() {
    elements.countrySuggestionsList.classList.remove('visible');
    elements.countrySuggestionsList.innerHTML = '';
}

// ============================================================
// OPENAI ENRICHMENT
// ============================================================

async function callOpenAI(prompt, retries = CLUB_CREATE_CONFIG.OPENAI_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CLUB_CREATE_CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('OpenAI API Error:', errorData);
                if (i === retries - 1) {
                    throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
                }
                await new Promise(resolve => setTimeout(resolve, CLUB_CREATE_CONFIG.OPENAI_RETRY_DELAY));
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) return content;

            if (i === retries - 1) {
                throw new Error('OpenAI returned empty content');
            }
            await new Promise(resolve => setTimeout(resolve, CLUB_CREATE_CONFIG.OPENAI_RETRY_DELAY));
        } catch (error) {
            console.error(`OpenAI call attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, CLUB_CREATE_CONFIG.OPENAI_RETRY_DELAY));
        }
    }
    return null;
}

async function enrichClubData(clubName, countryCode) {
    const enrichedData = {
        city: null,
        media: null,
        web: null
    };

    // Enrich city
    logProgress('Fetching city information...', 'info');
    try {
        const cityPrompt = `What is the city and country of the football club '${clubName}' from country code '${countryCode}'? Provide the answer in English, in the format 'City, FullCountryName'. Only provide the location, nothing else.`;
        const cityResult = await callOpenAI(cityPrompt);
        if (cityResult) {
            enrichedData.city = cityResult.replace(/['"]/g, '').trim();
            logProgress(`City: ${enrichedData.city}`, 'success');
        } else {
            logProgress('City: Could not retrieve', 'error');
        }
    } catch (e) {
        console.error('City enrichment failed:', e);
        logProgress(`City: Error - ${e.message}`, 'error');
    }

    // Enrich media (hashtags)
    logProgress('Fetching relevant hashtags...', 'info');
    try {
        const mediaPrompt = `Provide 5 relevant hashtags in English for the football club '${clubName}'. These hashtags should be commonly used by the club, its fans, or in relation to the club, its stadium, or competitions it participates in. List them separated by single spaces, without commas, for example: #hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5. Only provide the hashtags, nothing else.`;
        const mediaResult = await callOpenAI(mediaPrompt);
        if (mediaResult) {
            enrichedData.media = mediaResult.replace(/['"]/g, '').trim();
            logProgress(`Hashtags: ${enrichedData.media}`, 'success');
        } else {
            logProgress('Hashtags: Could not retrieve', 'error');
        }
    } catch (e) {
        console.error('Media enrichment failed:', e);
        logProgress(`Hashtags: Error - ${e.message}`, 'error');
    }

    // Enrich web (Wikipedia or website)
    logProgress('Fetching website/Wikipedia URL...', 'info');
    try {
        const webPrompt = `Find a web URL for the football club '${clubName}' from country code '${countryCode}'. Prioritize in the following order: 1. The club's official English Wikipedia page. 2. If not found, the club's Wikipedia page in its local language. 3. If not found, the club's official website. 4. If none found, any relevant informational page (Transfermarkt, Soccerway). Provide only the URL as a string, nothing else.`;
        const webResult = await callOpenAI(webPrompt);
        if (webResult) {
            // Clean up the URL
            let cleanUrl = webResult.replace(/['"<>]/g, '').trim();
            // Ensure it starts with http
            if (cleanUrl && !cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            enrichedData.web = cleanUrl;
            logProgress(`Website: ${enrichedData.web}`, 'success');
        } else {
            logProgress('Website: Could not retrieve', 'error');
        }
    } catch (e) {
        console.error('Web enrichment failed:', e);
        logProgress(`Website: Error - ${e.message}`, 'error');
    }

    return enrichedData;
}

// ============================================================
// FORM HANDLING
// ============================================================

function validateForm() {
    const clubName = elements.clubNameInput.value.trim();
    const countryCode = elements.countryCodeInput.value.trim();

    // Check if club name already exists
    const clubExists = allClubs.some(c => c.name.toLowerCase() === clubName.toLowerCase());

    const isValid = clubName.length >= 2 &&
                    countryCode.length === 3 &&
                    !clubExists;

    elements.submitBtn.disabled = !isValid;

    return isValid;
}

function resetForm() {
    elements.clubNameInput.value = '';
    elements.countryCodeInput.value = '';
    elements.clubCityInput.value = '';
    elements.clubMediaInput.value = '';
    elements.clubWebInput.value = '';
    elements.autoEnrichCheckbox.checked = true;
    elements.manualFields.style.display = 'none';
    elements.progressLog.style.display = 'none';
    elements.progressLog.innerHTML = '';
    elements.statusMessage.style.display = 'none';
    elements.resultCard.style.display = 'none';
    elements.submitBtn.disabled = true;
    hideSuggestions();
    hideCountrySuggestions();
}

async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const clubName = elements.clubNameInput.value.trim();
    const countryCode = elements.countryCodeInput.value.trim().toUpperCase();
    const autoEnrich = elements.autoEnrichCheckbox.checked;

    elements.submitBtn.disabled = true;
    elements.progressLog.innerHTML = '';
    elements.progressLog.style.display = 'block';
    elements.statusMessage.style.display = 'none';
    elements.resultCard.style.display = 'none';

    let createdClub = null;

    try {
        // Step 1: Create the club
        logProgress(`Creating club "${clubName}"...`, 'info');

        const { data: newClub, error: insertError } = await supabaseClient
            .from('clubs')
            .insert([{ name: clubName, country: countryCode }])
            .select()
            .single();

        if (insertError) {
            throw new Error(`Database error: ${insertError.message}`);
        }

        if (!newClub) {
            throw new Error('Club created but could not retrieve data');
        }

        createdClub = newClub;
        logProgress(`Club created with ID: ${createdClub.id}`, 'success');

        // Step 2: Enrich data (if enabled)
        let updatePayload = {};

        if (autoEnrich) {
            logProgress('Starting AI enrichment...', 'info');
            const enrichedData = await enrichClubData(clubName, countryCode);

            if (enrichedData.city) updatePayload.city = enrichedData.city;
            if (enrichedData.media) updatePayload.media = enrichedData.media;
            if (enrichedData.web) updatePayload.web = enrichedData.web;
        } else {
            // Use manual fields
            const city = elements.clubCityInput.value.trim();
            const media = elements.clubMediaInput.value.trim();
            const web = elements.clubWebInput.value.trim();

            if (city) updatePayload.city = city;
            if (media) updatePayload.media = media;
            if (web) updatePayload.web = web;
        }

        // Step 3: Update club with enriched data
        if (Object.keys(updatePayload).length > 0) {
            logProgress('Saving enriched data...', 'info');

            const { data: updatedClub, error: updateError } = await supabaseClient
                .from('clubs')
                .update(updatePayload)
                .eq('id', createdClub.id)
                .select()
                .single();

            if (updateError) {
                logProgress(`Warning: Could not save enriched data: ${updateError.message}`, 'error');
            } else if (updatedClub) {
                createdClub = updatedClub;
                logProgress('Enriched data saved successfully', 'success');
            }
        }

        // Step 4: Refresh clubs list
        await loadClubs();

        // Step 5: Show success
        logProgress('Club creation complete!', 'success');
        showResult(createdClub);

    } catch (error) {
        console.error('Error creating club:', error);
        logProgress(`ERROR: ${error.message}`, 'error');
        showStatus(`Error: ${error.message}`, 'error');

        if (createdClub && createdClub.id) {
            logProgress(`Note: Club was created (ID: ${createdClub.id}) but enrichment may have failed.`, 'error');
        }
    } finally {
        elements.submitBtn.disabled = false;
        validateForm();
    }
}

// ============================================================
// UI HELPERS
// ============================================================

function logProgress(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = message;
    elements.progressLog.appendChild(entry);
    elements.progressLog.scrollTop = elements.progressLog.scrollHeight;
}

function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.style.display = 'block';
}

function showResult(club) {
    elements.resultDetails.innerHTML = `
        <div class="result-row">
            <span class="result-label">ID:</span>
            <span class="result-value">${club.id}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Name:</span>
            <span class="result-value">${escapeHtml(club.name)}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Country:</span>
            <span class="result-value">${escapeHtml(club.country || 'N/A')}</span>
        </div>
        <div class="result-row">
            <span class="result-label">City:</span>
            <span class="result-value">${escapeHtml(club.city || 'Not set')}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Hashtags:</span>
            <span class="result-value">${escapeHtml(club.media || 'Not set')}</span>
        </div>
        <div class="result-row">
            <span class="result-label">Website:</span>
            <span class="result-value">${club.web ? `<a href="${escapeHtml(club.web)}" target="_blank">${escapeHtml(club.web)}</a>` : 'Not set'}</span>
        </div>
    `;

    elements.viewClubBtn.href = `/clubs/${club.id}.html`;
    elements.resultCard.style.display = 'block';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Club name input - search for duplicates
    elements.clubNameInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchClubs(elements.clubNameInput.value);
            validateForm();
        }, CLUB_CREATE_CONFIG.SEARCH_DEBOUNCE);
    });

    // Club name suggestions click
    elements.suggestionsList.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            // If clicking on existing club, just fill the name but show warning
            elements.clubNameInput.value = item.dataset.name;
            hideSuggestions();
            validateForm();
            showStatus('This club already exists. Please enter a different name.', 'error');
        }
    });

    // Country code input - search for existing countries
    elements.countryCodeInput.addEventListener('input', () => {
        // Force uppercase
        elements.countryCodeInput.value = elements.countryCodeInput.value.toUpperCase();

        clearTimeout(countrySearchTimeout);
        countrySearchTimeout = setTimeout(() => {
            searchCountries(elements.countryCodeInput.value);
            validateForm();
        }, CLUB_CREATE_CONFIG.SEARCH_DEBOUNCE);
    });

    // Country suggestions click
    elements.countrySuggestionsList.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            elements.countryCodeInput.value = item.dataset.code;
            hideCountrySuggestions();
            validateForm();
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!elements.clubNameInput.contains(e.target) && !elements.suggestionsList.contains(e.target)) {
            hideSuggestions();
        }
        if (!elements.countryCodeInput.contains(e.target) && !elements.countrySuggestionsList.contains(e.target)) {
            hideCountrySuggestions();
        }
    });

    // Auto-enrich toggle
    elements.autoEnrichCheckbox.addEventListener('change', () => {
        elements.manualFields.style.display = elements.autoEnrichCheckbox.checked ? 'none' : 'block';
    });

    // Form submit
    elements.createForm.addEventListener('submit', handleSubmit);

    // Create another button
    elements.createAnotherBtn.addEventListener('click', resetForm);

    // Logout button
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
    }
}
