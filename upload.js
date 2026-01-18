// upload.js - Sticker upload functionality

// ============================================================
// CONFIGURATION
// ============================================================

const UPLOAD_CONFIG = {
    // n8n webhook URL for social media posting (triggered after sticker insert)
    N8N_WEBHOOK_URL: 'https://n8n.ontext.info/webhook/sticker-uploaded',

    // Debounce delay for club search (ms)
    SEARCH_DEBOUNCE: 300,

    // Maximum suggestions to show
    MAX_SUGGESTIONS: 10,

    // Nominatim API settings
    NOMINATIM_USER_AGENT: 'StickerHunt/1.0 (stickerhunt.club)'
};

// ============================================================
// STATE
// ============================================================

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let clubs = [];
let selectedClub = null;
let selectedDifficulty = 1;
let selectedFile = null;
let extractedMetadata = {
    latitude: null,
    longitude: null,
    photoDate: null,
    locationName: null
};
let searchTimeout = null;

// ============================================================
// DOM ELEMENTS
// ============================================================

const elements = {
    loadingState: null,
    accessDenied: null,
    uploadFormContainer: null,
    uploadForm: null,
    clubInput: null,
    clubIdInput: null,
    suggestionsList: null,
    difficultyButtons: null,
    difficultyValue: null,
    dropzone: null,
    fileInput: null,
    imagePreview: null,
    metadataInfo: null,
    postToMediaCheckbox: null,
    submitBtn: null,
    statusMessage: null,
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
    elements.uploadFormContainer = document.getElementById('upload-form-container');
    elements.uploadForm = document.getElementById('upload-form');
    elements.clubInput = document.getElementById('club-input');
    elements.clubIdInput = document.getElementById('club-id');
    elements.suggestionsList = document.getElementById('suggestions-list');
    elements.difficultyButtons = document.querySelectorAll('.difficulty-btn');
    elements.difficultyValue = document.getElementById('difficulty-value');
    elements.dropzone = document.getElementById('dropzone');
    elements.fileInput = document.getElementById('file-input');
    elements.imagePreview = document.getElementById('image-preview');
    elements.metadataInfo = document.getElementById('metadata-info');
    elements.postToMediaCheckbox = document.getElementById('post-to-media');
    elements.submitBtn = document.getElementById('submit-btn');
    elements.statusMessage = document.getElementById('status-message');
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
            showAccessDenied('Please sign in to upload stickers.');
            setupLoginButton();
            return;
        }

        currentUser = session.user;

        // Load profile with can_upload permission
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

        // Check upload permission
        if (!profile.can_upload) {
            showAccessDenied('You don\'t have permission to upload stickers.');
            return;
        }

        // Load clubs and show form
        await loadClubs();
        showUploadForm();

    } catch (error) {
        console.error('Auth check error:', error);
        showAccessDenied('Error checking permissions. Please try again.');
    }
}

function setupLoginButton() {
    if (elements.loginButton) {
        elements.loginButton.style.display = 'inline-flex';
        elements.loginButton.addEventListener('click', async () => {
            await SharedUtils.loginWithGoogle(supabaseClient, '/upload.html');
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

function showUploadForm() {
    elements.loadingState.style.display = 'none';
    elements.uploadFormContainer.style.display = 'block';
}

// ============================================================
// CLUB LOADING & AUTOCOMPLETE
// ============================================================

async function loadClubs() {
    try {
        const { data, error } = await supabaseClient
            .from('clubs')
            .select('id, name, country')
            .order('name');

        if (error) throw error;
        clubs = data || [];
        console.log(`Loaded ${clubs.length} clubs`);
    } catch (error) {
        console.error('Error loading clubs:', error);
        showStatus('Error loading clubs list', 'error');
    }
}

function searchClubs(query) {
    if (!query || query.length < 2) {
        hideSuggestions();
        return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = clubs
        .filter(club => club.name.toLowerCase().includes(lowerQuery))
        .slice(0, UPLOAD_CONFIG.MAX_SUGGESTIONS);

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    showSuggestions(matches);
}

function showSuggestions(matches) {
    elements.suggestionsList.innerHTML = matches.map((club, index) => `
        <li class="suggestion-item" data-id="${club.id}" data-name="${club.name}" data-index="${index}">
            ${escapeHtml(club.name)}
            <span class="suggestion-country">${escapeHtml(club.country || '')}</span>
        </li>
    `).join('');

    elements.suggestionsList.classList.add('visible');
}

function hideSuggestions() {
    elements.suggestionsList.classList.remove('visible');
    elements.suggestionsList.innerHTML = '';
}

function selectClub(id, name) {
    selectedClub = { id, name };
    elements.clubInput.value = name;
    elements.clubIdInput.value = id;
    hideSuggestions();
    validateForm();
}

// ============================================================
// FILE HANDLING & EXIF
// ============================================================

async function handleFile(file) {
    if (!file || file.type !== 'image/jpeg') {
        showStatus('Please select a JPEG image file', 'error');
        return;
    }

    selectedFile = file;

    // Update dropzone
    elements.dropzone.classList.add('has-file');
    const filenameEl = elements.dropzone.querySelector('.dropzone-filename');
    filenameEl.textContent = file.name;
    filenameEl.style.display = 'block';
    elements.dropzone.querySelector('.dropzone-text').textContent = 'Click to change file';

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    elements.imagePreview.innerHTML = `<img src="${previewUrl}" alt="Preview">`;
    elements.imagePreview.style.display = 'block';

    // Extract EXIF
    await extractExifData(file);

    validateForm();
}

async function extractExifData(file) {
    // Reset metadata
    extractedMetadata = {
        latitude: null,
        longitude: null,
        photoDate: null,
        locationName: null
    };

    if (typeof exifr === 'undefined') {
        console.warn('exifr library not loaded');
        elements.metadataInfo.style.display = 'none';
        return;
    }

    try {
        const exifData = await exifr.parse(file, {
            gps: true,
            tiff: true,
            exif: true,
            mergeOutput: false,
            reviveValues: true
        });

        console.log('EXIF data:', exifData);

        let metadataHtml = [];

        // Extract GPS
        if (exifData?.gps?.latitude && exifData?.gps?.longitude) {
            extractedMetadata.latitude = exifData.gps.latitude;
            extractedMetadata.longitude = exifData.gps.longitude;
            metadataHtml.push(`<p>GPS: ${extractedMetadata.latitude.toFixed(5)}, ${extractedMetadata.longitude.toFixed(5)}</p>`);

            // Reverse geocode
            const locationName = await reverseGeocode(extractedMetadata.latitude, extractedMetadata.longitude);
            if (locationName) {
                extractedMetadata.locationName = locationName;
                metadataHtml.push(`<p>Location: ${escapeHtml(locationName)}</p>`);
            }
        } else {
            metadataHtml.push('<p>GPS data not found in image</p>');
        }

        // Extract date
        const photoDateSource = exifData?.DateTimeOriginal ||
                                exifData?.exif?.DateTimeOriginal ||
                                exifData?.CreateDate ||
                                exifData?.exif?.CreateDate;

        if (photoDateSource) {
            const photoDate = (photoDateSource instanceof Date) ? photoDateSource : new Date(photoDateSource);
            if (!isNaN(photoDate.getTime())) {
                extractedMetadata.photoDate = photoDate.toISOString().split('T')[0];
                metadataHtml.push(`<p>Photo date: ${formatDate(extractedMetadata.photoDate)}</p>`);
            }
        } else {
            metadataHtml.push('<p>Photo date not found in image</p>');
        }

        if (metadataHtml.length > 0) {
            elements.metadataInfo.innerHTML = metadataHtml.join('');
            elements.metadataInfo.style.display = 'block';
        }

    } catch (error) {
        console.error('EXIF extraction error:', error);
        elements.metadataInfo.innerHTML = '<p>Could not read image metadata</p>';
        elements.metadataInfo.style.display = 'block';
    }
}

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=en`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': UPLOAD_CONFIG.NOMINATIM_USER_AGENT }
        });

        if (!response.ok) {
            console.error('Nominatim error:', response.status);
            return null;
        }

        const data = await response.json();

        if (data?.address) {
            const addr = data.address;
            const city = addr.city || addr.town || addr.village || addr.hamlet ||
                         addr.borough || addr.municipality || addr.county || '';
            const country = addr.country || '';

            if (city && country) return `${city}, ${country}`;
            if (city) return city;
            if (country) return country;
        }

        return data.display_name || null;

    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// ============================================================
// FORM VALIDATION & SUBMISSION
// ============================================================

function validateForm() {
    const isValid = selectedClub && selectedFile;
    elements.submitBtn.disabled = !isValid;
    return isValid;
}

async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
        showStatus('Please fill all required fields', 'error');
        return;
    }

    elements.submitBtn.disabled = true;
    showStatus('Uploading...', 'info');

    try {
        // 1. Upload file to Storage
        const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
        const storagePath = `club_${selectedClub.id}/${fileName}`;

        showStatus('Uploading image...', 'info');
        const { error: uploadError } = await supabaseClient.storage
            .from('stickers')
            .upload(storagePath, selectedFile);

        if (uploadError) {
            throw new Error('Upload failed: ' + uploadError.message);
        }

        // 2. Construct image URL
        const imageUrl = `${SharedUtils.CONFIG.SUPABASE_URL}/storage/v1/object/public/stickers/${storagePath}`;

        // 3. Insert sticker record
        showStatus('Saving to database...', 'info');
        const insertData = {
            club_id: selectedClub.id,
            difficulty: selectedDifficulty,
            image_url: imageUrl
        };

        // Add optional fields from EXIF
        if (extractedMetadata.locationName) {
            insertData.location = extractedMetadata.locationName;
        }
        if (extractedMetadata.latitude !== null && extractedMetadata.longitude !== null) {
            insertData.latitude = extractedMetadata.latitude;
            insertData.longitude = extractedMetadata.longitude;
        }
        if (extractedMetadata.photoDate) {
            insertData.found = extractedMetadata.photoDate;
        }

        const { data: sticker, error: insertError } = await supabaseClient
            .from('stickers')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            throw new Error('Database error: ' + insertError.message);
        }

        // 4. Trigger n8n webhook for social media posting (always, with post flag)
        const postToMedia = elements.postToMediaCheckbox ? elements.postToMediaCheckbox.checked : true;
        console.log('Post to media checkbox state:', postToMedia);

        showStatus('Sticker saved! Notifying automation...', 'info');
        const socialResult = await triggerWebhook(sticker, postToMedia);

        // 5. Show success message with link
        const stickerUrl = socialResult.sticker_url || `https://stickerhunt.club/stickers/${sticker.id}.html`;

        // Build status messages
        let socialInfo = '';
        if (!postToMedia) {
            socialInfo = `<p class="social-warning">📱 Social post: NO POST</p>`;
        } else if (socialResult.success && socialResult.scheduled_for) {
            socialInfo = `<p class="social-success">📱 Social post scheduled: ${escapeHtml(formatScheduledTime(socialResult.scheduled_for))}</p>`;
        } else if (socialResult.success) {
            socialInfo = `<p class="social-success">📱 Social post: scheduled</p>`;
        } else {
            socialInfo = `<p class="social-warning">📱 Social post: ${escapeHtml(socialResult.message || 'pending')}</p>`;
        }

        // Page generation & optimization status
        let automationInfo = '';
        if (socialResult.page_generation) {
            automationInfo += `<p class="automation-success">📄 Page generation: ${escapeHtml(socialResult.page_generation)}</p>`;
        }
        if (socialResult.image_optimization) {
            automationInfo += `<p class="automation-success">🖼️ Image optimization: ${escapeHtml(socialResult.image_optimization)}</p>`;
        }

        showStatus(`
            <strong>Sticker uploaded successfully!</strong>
            <div class="result-details">
                <p>ID: ${sticker.id}</p>
                <p>Club: ${escapeHtml(selectedClub.name)}</p>
                <p>Difficulty: ${sticker.difficulty}</p>
                ${sticker.location ? `<p>Location: ${escapeHtml(sticker.location)}</p>` : ''}
                ${sticker.found ? `<p>Date: ${formatDate(sticker.found)}</p>` : ''}
                ${socialInfo}
                ${automationInfo}
                <p><a href="${stickerUrl}" target="_blank">View sticker page →</a></p>
            </div>
        `, 'success');

        // Reset form for next upload
        resetForm();

    } catch (error) {
        console.error('Submit error:', error);
        showStatus('Error: ' + error.message, 'error');
        elements.submitBtn.disabled = false;
    }
}

async function triggerWebhook(sticker, postToMedia = true) {
    try {
        // Generate sticker page URL
        const stickerUrl = `https://stickerhunt.club/stickers/${sticker.id}.html`;

        const payload = {
            sticker_id: sticker.id,
            sticker_url: stickerUrl,
            club_id: sticker.club_id,
            club_name: selectedClub.name,
            difficulty: sticker.difficulty,
            image_url: sticker.image_url,
            location: sticker.location,
            latitude: sticker.latitude,
            longitude: sticker.longitude,
            found: sticker.found,
            post: postToMedia
        };

        console.log('Sending webhook payload:', payload);

        const response = await fetch(UPLOAD_CONFIG.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return {
                success: true,
                sticker_url: data.sticker_url || stickerUrl,
                scheduled_for: data.scheduled_for || data.scheduledFor || null,
                page_generation: data.page_generation || null,
                image_optimization: data.image_optimization || null,
                post_url: data.post_url || null
            };
        } else {
            console.warn('Webhook response not OK:', response.status);
            return { success: false, message: 'Could not schedule post' };
        }
    } catch (error) {
        console.warn('Webhook error (non-critical):', error);
        return { success: false, message: 'Social posting unavailable' };
    }
}

/**
 * Format scheduled time for display
 */
function formatScheduledTime(isoString) {
    if (!isoString) return 'soon';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

function resetForm() {
    // Reset state
    selectedClub = null;
    selectedFile = null;
    extractedMetadata = {
        latitude: null,
        longitude: null,
        photoDate: null,
        locationName: null
    };

    // Reset inputs
    elements.clubInput.value = '';
    elements.clubIdInput.value = '';
    elements.fileInput.value = '';

    // Reset difficulty to 1
    selectedDifficulty = 1;
    elements.difficultyValue.value = '1';
    elements.difficultyButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === '1');
    });

    // Reset "Post to media" checkbox to checked
    if (elements.postToMediaCheckbox) {
        elements.postToMediaCheckbox.checked = true;
    }

    // Reset dropzone
    elements.dropzone.classList.remove('has-file');
    elements.dropzone.querySelector('.dropzone-text').textContent = 'Drag & drop a JPEG file here or click to select';
    elements.dropzone.querySelector('.dropzone-filename').style.display = 'none';

    // Hide preview and metadata
    elements.imagePreview.style.display = 'none';
    elements.imagePreview.innerHTML = '';
    elements.metadataInfo.style.display = 'none';
    elements.metadataInfo.innerHTML = '';

    // Re-enable submit (but it will be disabled by validation)
    validateForm();
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    // Club autocomplete
    elements.clubInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        if (searchTimeout) clearTimeout(searchTimeout);

        // Reset selected club if input changed
        if (selectedClub && selectedClub.name !== query) {
            selectedClub = null;
            elements.clubIdInput.value = '';
            validateForm();
        }

        // Debounced search
        searchTimeout = setTimeout(() => {
            searchClubs(query);
        }, UPLOAD_CONFIG.SEARCH_DEBOUNCE);
    });

    // Handle keyboard navigation in suggestions
    elements.clubInput.addEventListener('keydown', (e) => {
        const suggestions = elements.suggestionsList.querySelectorAll('.suggestion-item');
        if (!suggestions.length) return;

        const current = elements.suggestionsList.querySelector('.suggestion-item.selected');
        let currentIndex = current ? parseInt(current.dataset.index) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
            updateSelectedSuggestion(suggestions, currentIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentIndex = Math.max(currentIndex - 1, 0);
            updateSelectedSuggestion(suggestions, currentIndex);
        } else if (e.key === 'Enter' && current) {
            e.preventDefault();
            selectClub(current.dataset.id, current.dataset.name);
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    // Click on suggestion
    elements.suggestionsList.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            selectClub(item.dataset.id, item.dataset.name);
        }
    });

    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!elements.clubInput.contains(e.target) && !elements.suggestionsList.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Difficulty buttons
    elements.difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.difficultyButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDifficulty = parseInt(btn.dataset.value);
            elements.difficultyValue.value = btn.dataset.value;
        });
    });

    // Dropzone
    elements.dropzone.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', () => {
        elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    // Form submission
    elements.uploadForm.addEventListener('submit', handleSubmit);

    // Logout
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', async () => {
            await SharedUtils.logout(supabaseClient, currentUser?.id);
            window.location.href = '/index.html';
        });
    }
}

function updateSelectedSuggestion(suggestions, index) {
    suggestions.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function showStatus(html, type = 'info') {
    elements.statusMessage.innerHTML = html;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}.${month}.${year}`;
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
