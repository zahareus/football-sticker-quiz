// upload-batch.js - Batch sticker upload (no social media post)
//
// Flow:
//   1. Drop N JPEG images -> N rows auto-created (thumb + club autocomplete + difficulty + EXIF geo).
//   2. "Upload all" -> confirm() -> sequential Storage upload + DB insert per row (NO per-sticker webhook).
//   3. One POST to the batch webhook -> single repository_dispatch -> existing generate-sticker-pages.yml
//      generates all pages in one run and fires a Telegram alert when done.
//   4. Report view lists every sticker that was sent for generation.

// ============================================================
// CONFIGURATION
// ============================================================

const BATCH_CONFIG = {
    // n8n webhook: triggers ONE repository_dispatch for the whole batch + Telegram notify.
    N8N_BATCH_WEBHOOK_URL: 'https://n8n.ontext.info/webhook/sticker-batch-uploaded',
    SEARCH_DEBOUNCE: 250,
    MAX_SUGGESTIONS: 10,
    NOMINATIM_USER_AGENT: 'StickerHunt/1.0 (stickerhunt.club)'
};

// ============================================================
// STATE
// ============================================================

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let clubs = [];

// rows: array of { id, file, previewUrl, club: {id,name,country}|null, difficulty,
//                  meta: {latitude, longitude, photoDate, locationName}, exifDone, searchTimeout }
let rows = [];
let rowSeq = 0;

const el = {};

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    el.loadingState = document.getElementById('loading-state');
    el.accessDenied = document.getElementById('access-denied');
    el.container = document.getElementById('batch-container');
    el.dropzone = document.getElementById('batch-dropzone');
    el.fileInput = document.getElementById('batch-file-input');
    el.rowsEl = document.getElementById('batch-rows');
    el.footer = document.getElementById('batch-footer');
    el.count = document.getElementById('batch-count');
    el.uploadBtn = document.getElementById('batch-upload-btn');
    el.globalStatus = document.getElementById('global-status');
    el.report = document.getElementById('batch-report');
    el.reportStatus = document.getElementById('global-status-report');
    el.reportRows = document.getElementById('batch-report-rows');
    el.loginButton = document.getElementById('login-button');
    el.userStatus = document.getElementById('user-status');
    el.userNickname = document.getElementById('user-nickname');
    el.logoutButton = document.getElementById('logout-button');

    supabaseClient = SharedUtils.initSupabaseClient();
    if (!supabaseClient) {
        showGlobal('Error initializing application', 'error');
        return;
    }

    await checkAuthAndPermissions();
    setupDropzone();
    setupLogout();
});

// ============================================================
// AUTH (mirrors upload.js)
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

        if (!profile.can_upload) {
            showAccessDenied("You don't have permission to upload stickers.");
            return;
        }

        await loadClubs();
        el.loadingState.style.display = 'none';
        el.container.style.display = 'block';
    } catch (error) {
        console.error('Auth check error:', error);
        showAccessDenied('Error checking permissions. Please try again.');
    }
}

function setupLoginButton() {
    if (el.loginButton) {
        el.loginButton.style.display = 'inline-flex';
        el.loginButton.addEventListener('click', async () => {
            await SharedUtils.loginWithGoogle(supabaseClient, '/upload-batch.html');
        });
    }
}

function updateAuthUI() {
    if (currentUser && currentProfile) {
        if (el.loginButton) el.loginButton.style.display = 'none';
        if (el.userStatus) el.userStatus.style.display = 'flex';
        if (el.userNickname) el.userNickname.textContent = SharedUtils.truncateString(currentProfile.username);
    }
}

function setupLogout() {
    if (el.logoutButton) {
        el.logoutButton.addEventListener('click', async () => {
            await SharedUtils.logout(supabaseClient, currentUser?.id);
            window.location.href = '/index.html';
        });
    }
}

function showAccessDenied(message) {
    el.loadingState.style.display = 'none';
    el.accessDenied.style.display = 'block';
    if (message) el.accessDenied.querySelector('p').textContent = message;
}

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
        showGlobal('Error loading clubs list', 'error');
    }
}

// ============================================================
// DROPZONE & ROW CREATION
// ============================================================

function setupDropzone() {
    el.dropzone.addEventListener('click', () => el.fileInput.click());
    el.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.dropzone.classList.add('dragover');
    });
    el.dropzone.addEventListener('dragleave', () => el.dropzone.classList.remove('dragover'));
    el.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        el.dropzone.classList.remove('dragover');
        addFiles(e.dataTransfer.files);
    });
    el.fileInput.addEventListener('change', (e) => {
        addFiles(e.target.files);
        el.fileInput.value = '';
    });
    el.uploadBtn.addEventListener('click', handleUploadAll);
}

function addFiles(fileList) {
    const files = Array.from(fileList || []);
    let skipped = 0;
    for (const file of files) {
        if (file.type !== 'image/jpeg') { skipped++; continue; }
        const row = {
            id: ++rowSeq,
            file,
            previewUrl: URL.createObjectURL(file),
            club: null,
            difficulty: 1,
            meta: { latitude: null, longitude: null, photoDate: null, locationName: null },
            exifDone: false,
            searchTimeout: null
        };
        rows.push(row);
        renderRow(row);
        extractExif(row); // async, fills meta + updates the row in place
    }
    if (skipped > 0) showGlobal(`Skipped ${skipped} non-JPEG file(s).`, 'info');
    refreshFooter();
}

function renderRow(row) {
    const div = document.createElement('div');
    div.className = 'batch-row';
    div.id = `row-${row.id}`;
    div.innerHTML = `
        <img class="batch-thumb" src="${row.previewUrl}" alt="preview">
        <div class="batch-col batch-col-content">
            <div class="batch-club-wrap">
                <input type="text" class="batch-club-input" placeholder="Type club name..." autocomplete="off">
                <ul class="batch-suggestions"></ul>
            </div>
            <div class="batch-filename" data-role="filename" title="${escapeAttr(row.file.name)}">📄 ${escapeHtml(row.file.name)}</div>
            <div class="batch-meta pending" data-role="meta">Reading location…</div>
            <div class="batch-diff-wrap">
                <span class="batch-diff-label">Difficulty</span>
                <div class="batch-diff">
                    <button type="button" class="batch-diff-btn active" data-value="1">1</button>
                    <button type="button" class="batch-diff-btn" data-value="2">2</button>
                    <button type="button" class="batch-diff-btn" data-value="3">3</button>
                </div>
            </div>
        </div>
        <button type="button" class="batch-remove" title="Remove">&times;</button>
    `;
    el.rowsEl.appendChild(div);

    const clubInput = div.querySelector('.batch-club-input');
    const suggestions = div.querySelector('.batch-suggestions');

    clubInput.addEventListener('input', () => {
        const query = clubInput.value.trim();
        if (row.club && row.club.name !== query) {
            row.club = null;
            refreshFooter();
        }
        if (row.searchTimeout) clearTimeout(row.searchTimeout);
        row.searchTimeout = setTimeout(() => searchClubs(query, suggestions, row, clubInput), BATCH_CONFIG.SEARCH_DEBOUNCE);
    });
    clubInput.addEventListener('keydown', (e) => handleClubKeydown(e, suggestions, row, clubInput));
    suggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.batch-suggestion');
        if (item) selectClub(row, clubInput, suggestions, item.dataset.id, item.dataset.name, item.dataset.country);
    });
    document.addEventListener('click', (e) => {
        if (!clubInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('visible');
        }
    });

    div.querySelectorAll('.batch-diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            div.querySelectorAll('.batch-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            row.difficulty = parseInt(btn.dataset.value, 10);
        });
    });

    div.querySelector('.batch-remove').addEventListener('click', () => removeRow(row));
}

function removeRow(row) {
    rows = rows.filter(r => r.id !== row.id);
    const div = document.getElementById(`row-${row.id}`);
    if (div) div.remove();
    if (row.previewUrl) URL.revokeObjectURL(row.previewUrl);
    refreshFooter();
}

// ============================================================
// CLUB AUTOCOMPLETE (per-row)
// ============================================================

function searchClubs(query, suggestions, row, clubInput) {
    if (!query || query.length < 2) { suggestions.classList.remove('visible'); return; }
    const lower = query.toLowerCase();
    const matches = clubs.filter(c => c.name.toLowerCase().includes(lower)).slice(0, BATCH_CONFIG.MAX_SUGGESTIONS);
    if (matches.length === 0) { suggestions.classList.remove('visible'); suggestions.innerHTML = ''; return; }
    suggestions.innerHTML = matches.map((c, i) => `
        <li class="batch-suggestion" data-id="${c.id}" data-name="${escapeAttr(c.name)}" data-country="${escapeAttr(c.country || '')}" data-index="${i}">
            ${escapeHtml(c.name)}<span class="batch-suggestion-country">${escapeHtml(c.country || '')}</span>
        </li>
    `).join('');
    suggestions.classList.add('visible');
}

function handleClubKeydown(e, suggestions, row, clubInput) {
    const items = suggestions.querySelectorAll('.batch-suggestion');
    if (!items.length) return;
    const current = suggestions.querySelector('.batch-suggestion.selected');
    let idx = current ? parseInt(current.dataset.index, 10) : -1;
    if (e.key === 'ArrowDown') {
        e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); markSelected(items, idx);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault(); idx = Math.max(idx - 1, 0); markSelected(items, idx);
    } else if (e.key === 'Enter' && current) {
        e.preventDefault();
        selectClub(row, clubInput, suggestions, current.dataset.id, current.dataset.name, current.dataset.country);
    } else if (e.key === 'Escape') {
        suggestions.classList.remove('visible');
    }
}

function markSelected(items, index) {
    items.forEach((it, i) => it.classList.toggle('selected', i === index));
}

function selectClub(row, clubInput, suggestions, id, name, country) {
    row.club = { id: parseInt(id, 10), name, country: country || '' };
    clubInput.value = name;
    suggestions.classList.remove('visible');
    refreshFooter();
}

// ============================================================
// EXIF (per file)
// ============================================================

async function extractExif(row) {
    if (typeof exifr === 'undefined') {
        row.exifDone = true;
        renderMeta(row);
        return;
    }
    try {
        const exifData = await exifr.parse(row.file, { gps: true, tiff: true, exif: true, mergeOutput: false, reviveValues: true });

        // Coordinates are extracted locally — no network needed. Save them regardless
        // of whether we can resolve a human-readable place name.
        if (exifData?.gps?.latitude && exifData?.gps?.longitude) {
            row.meta.latitude = exifData.gps.latitude;
            row.meta.longitude = exifData.gps.longitude;
        }

        const dateSrc = exifData?.DateTimeOriginal || exifData?.exif?.DateTimeOriginal ||
                        exifData?.CreateDate || exifData?.exif?.CreateDate;
        if (dateSrc) {
            const d = (dateSrc instanceof Date) ? dateSrc : new Date(dateSrc);
            if (!isNaN(d.getTime())) row.meta.photoDate = d.toISOString().split('T')[0];
        }
    } catch (err) {
        console.warn('EXIF error for row', row.id, err);
    }

    row.exifDone = true;
    renderMeta(row); // show coords immediately (GPS found)

    // Resolve place name in the background, throttled to respect Nominatim limits.
    if (row.meta.latitude !== null && row.meta.longitude !== null) {
        row.geocoding = true;
        renderMeta(row);
        enqueueGeocode(row.meta.latitude, row.meta.longitude)
            .then(loc => { if (loc) row.meta.locationName = loc; })
            .catch(() => {})
            .finally(() => { row.geocoding = false; renderMeta(row); });
    }
}

function renderMeta(row) {
    const m = document.querySelector(`#row-${row.id} [data-role="meta"]`);
    if (!m) return;
    const hasGps = row.meta.latitude !== null && row.meta.longitude !== null;
    let geoPart;
    if (row.meta.locationName) {
        geoPart = `📍 ${row.meta.locationName}`;
    } else if (hasGps) {
        geoPart = `📍 ${row.meta.latitude.toFixed(4)}, ${row.meta.longitude.toFixed(4)}${row.geocoding ? ' · locating…' : ''}`;
    } else {
        geoPart = '📍 GPS not found';
    }
    const parts = [geoPart];
    if (row.meta.photoDate) parts.push(`🗓 ${formatDate(row.meta.photoDate)}`);
    setMeta(m, parts.join(' · '), hasGps);
}

function setMeta(m, text, found) {
    if (!m) return;
    m.textContent = text;
    m.className = `batch-meta ${found ? 'found' : ''}`;
}

// Nominatim allows ~1 request/second and blocks concurrent/bulk requests (HTTP 429).
// A batch drop would fire N reverse-geocodes at once -> all 429. So serialize them
// through a single queue, spaced ~1.1s apart, with one retry on 429.
let geocodeChain = Promise.resolve();
let lastGeocodeAt = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function enqueueGeocode(lat, lon) {
    const run = geocodeChain.then(async () => {
        const wait = 1100 - (Date.now() - lastGeocodeAt);
        if (wait > 0) await sleep(wait);
        lastGeocodeAt = Date.now();
        return reverseGeocodeOnce(lat, lon);
    });
    // Keep the chain alive even if one lookup throws.
    geocodeChain = run.catch(() => {});
    return run;
}

async function reverseGeocodeOnce(lat, lon, retry = true) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=en`;
    try {
        const resp = await fetch(url);
        if (resp.status === 429 && retry) {
            await sleep(1500);
            lastGeocodeAt = Date.now();
            return reverseGeocodeOnce(lat, lon, false);
        }
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data?.address) {
            const a = data.address;
            const city = a.city || a.town || a.municipality || a.village || a.hamlet || a.county || '';
            const country = a.country || '';
            if (city && country) return `${city}, ${country}`;
            if (city) return city;
            if (country) return country;
        }
        return data.display_name || null;
    } catch (err) {
        console.warn('Geocode error:', err);
        return null;
    }
}

// ============================================================
// FOOTER / VALIDATION
// ============================================================

function refreshFooter() {
    if (rows.length === 0) {
        el.footer.style.display = 'none';
        return;
    }
    el.footer.style.display = 'flex';
    const ready = rows.filter(r => r.club && r.file).length;
    el.count.textContent = `${rows.length} sticker(s) · ${ready} ready · ${rows.length - ready} need a club`;
    el.uploadBtn.disabled = ready === 0;

    rows.forEach(r => {
        const div = document.getElementById(`row-${r.id}`);
        if (div) div.classList.toggle('invalid', !r.club);
    });
}

// ============================================================
// UPLOAD ALL
// ============================================================

async function handleUploadAll() {
    const valid = rows.filter(r => r.club && r.file);
    const incomplete = rows.length - valid.length;

    if (valid.length === 0) {
        showGlobal('No rows are ready — select a club for at least one sticker.', 'error');
        return;
    }

    let confirmMsg = `Upload ${valid.length} sticker(s)?`;
    if (incomplete > 0) confirmMsg += `\n\n${incomplete} row(s) without a club will be SKIPPED.`;
    confirmMsg += `\n\nDid you check everything — clubs, difficulty, locations?`;
    if (!window.confirm(confirmMsg)) return;

    el.uploadBtn.disabled = true;
    el.dropzone.style.pointerEvents = 'none';

    // Let the throttled geocode queue finish so place names are saved with the
    // stickers (Nominatim is ~1 req/sec, so a big batch needs a moment). Coords
    // are already captured either way.
    const pendingGeo = valid.some(r => r.geocoding);
    if (pendingGeo) {
        showGlobal('Resolving locations… (a few seconds for large batches)', 'info');
        await geocodeChain;
    }

    showGlobal(`Uploading 0/${valid.length}…`, 'info');

    const results = []; // { row, ok, sticker?, error? }
    let done = 0;

    for (const row of valid) {
        try {
            const sticker = await uploadOne(row);
            results.push({ row, ok: true, sticker });
            const div = document.getElementById(`row-${row.id}`);
            if (div) div.classList.add('done');
        } catch (err) {
            console.error('Upload failed for row', row.id, err);
            results.push({ row, ok: false, error: err.message || String(err) });
            const div = document.getElementById(`row-${row.id}`);
            if (div) div.classList.add('invalid');
        }
        done++;
        showGlobal(`Uploading ${done}/${valid.length}…`, 'info');
    }

    const succeeded = results.filter(r => r.ok);
    const stickerIds = succeeded.map(r => r.sticker.id);

    // Trigger ONE generation run + Telegram notify for the whole batch.
    if (stickerIds.length > 0) {
        const clubIds = [...new Set(succeeded.map(r => r.row.club.id))];
        const countries = [...new Set(succeeded.map(r => r.row.club.country).filter(Boolean))];
        await triggerBatchWebhook(stickerIds, clubIds, countries);
    }

    renderReport(results);
}

async function uploadOne(row) {
    // 1. Storage
    const fileName = `${Date.now()}_${row.file.name.replace(/\s+/g, '_')}`;
    const storagePath = `club_${row.club.id}/${fileName}`;
    const { error: uploadError } = await supabaseClient.storage.from('stickers').upload(storagePath, row.file);
    if (uploadError) throw new Error('Storage: ' + uploadError.message);

    // 2. URL
    const imageUrl = `${SharedUtils.CONFIG.SUPABASE_URL}/storage/v1/object/public/stickers/${storagePath}`;

    // 3. Insert
    const insertData = { club_id: row.club.id, difficulty: row.difficulty, image_url: imageUrl };
    if (row.meta.locationName) insertData.location = row.meta.locationName;
    if (row.meta.latitude !== null && row.meta.longitude !== null) {
        insertData.latitude = row.meta.latitude;
        insertData.longitude = row.meta.longitude;
    }
    if (row.meta.photoDate) insertData.found = row.meta.photoDate;

    const { data: sticker, error: insertError } = await supabaseClient
        .from('stickers').insert(insertData).select().single();
    if (insertError) throw new Error('DB: ' + insertError.message);
    return sticker;
}

async function triggerBatchWebhook(stickerIds, clubIds, countries) {
    const payload = {
        sticker_ids: stickerIds.join(','),
        club_ids: clubIds.join(','),
        n_stickers: stickerIds.length,
        n_clubs: clubIds.length,
        n_countries: countries.length,
        notify: true
    };
    try {
        const resp = await fetch(BATCH_CONFIG.N8N_BATCH_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) console.warn('Batch webhook not OK:', resp.status);
    } catch (err) {
        console.warn('Batch webhook error (non-critical):', err);
    }
}

// ============================================================
// REPORT VIEW
// ============================================================

function renderReport(results) {
    el.container.style.display = 'none';
    el.report.style.display = 'block';

    const ok = results.filter(r => r.ok).length;
    const failed = results.length - ok;

    el.reportStatus.className = `global-status ${failed ? 'error' : 'success'}`;
    el.reportStatus.innerHTML = failed
        ? `<strong>Process started.</strong> ${ok} sticker(s) sent for generation, ${failed} failed to upload. A Telegram message will arrive when pages are generated.`
        : `<strong>Process started.</strong> ${ok} sticker(s) sent for generation & optimization. A Telegram message will arrive when pages are generated.`;

    el.reportRows.innerHTML = results.map(r => {
        if (r.ok) {
            const s = r.sticker;
            let loc;
            if (s.location) loc = escapeHtml(s.location);
            else if (s.latitude != null && s.longitude != null) loc = `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`;
            else loc = '—';
            const date = s.found ? formatDate(s.found) : '';
            return `
                <div class="batch-report-row ok">
                    <img class="batch-report-thumb" src="${r.row.previewUrl}" alt="preview">
                    <div>
                        <div class="batch-report-line">
                            <strong>${escapeHtml(r.row.club.name)}</strong> · difficulty ${s.difficulty}
                        </div>
                        <div class="batch-report-sub">📄 ${escapeHtml(r.row.file.name)}</div>
                        <div class="batch-report-sub">
                            📍 ${loc}${date ? ` · 🗓 ${date}` : ''} · ID ${s.id} ·
                            <a href="https://stickerhunt.club/stickers/${s.id}.html" target="_blank">page →</a>
                        </div>
                    </div>
                </div>`;
        }
        return `
            <div class="batch-report-row error">
                <img class="batch-report-thumb" src="${r.row.previewUrl}" alt="preview">
                <div>
                    <div class="batch-report-line"><strong>${escapeHtml(r.row.club ? r.row.club.name : 'No club')}</strong></div>
                    <div class="batch-report-sub">❌ ${escapeHtml(r.error)}</div>
                </div>
            </div>`;
    }).join('');
}

// ============================================================
// UTILS
// ============================================================

function showGlobal(html, type = 'info') {
    el.globalStatus.innerHTML = html;
    el.globalStatus.className = `global-status ${type}`;
    el.globalStatus.style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const [y, m, d] = dateString.split('-');
        return `${d}.${m}.${y}`;
    } catch (e) { return dateString; }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;');
}
