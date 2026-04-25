// clubs-page.js — All Clubs directory page
// Loads all clubs from Supabase, sorts alphabetically by name (ignoring emoji flags),
// shows Most Collected strip and paginated table (100 per page)

const CLUBS_PER_PAGE = 100;

let supabaseClient;
let allClubsData = []; // enriched, sorted
let currentPage = 1;
let totalPages = 1;

// Strip emoji flags from club name for sorting
function cleanClubName(name) {
    return name.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
               .replace(/[\u200D\uFE0F]/g, '')
               .replace(/[\u{E0061}-\u{E007F}]/gu, '')
               .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
               .replace(/[\u{1F3F4}]/gu, '')
               .trim();
}

// Country code to name mapping (subset for display)
const countryNames = {
    "DEU":"Germany","ESP":"Spain","FRA":"France","NLD":"Netherlands","ITA":"Italy",
    "SWE":"Sweden","ENG":"England","CZE":"Czechia","BEL":"Belgium","CHE":"Switzerland",
    "POL":"Poland","AUT":"Austria","PRT":"Portugal","SCO":"Scotland","SRB":"Serbia",
    "HUN":"Hungary","NOR":"Norway","HRV":"Croatia","GRC":"Greece","DNK":"Denmark",
    "ROU":"Romania","UKR":"Ukraine","TUR":"Turkey","ISR":"Israel","JPN":"Japan",
    "CYP":"Cyprus","ARG":"Argentina","BRA":"Brazil","CHL":"Chile","COL":"Colombia",
    "URY":"Uruguay","USA":"United States","MEX":"Mexico","CAN":"Canada","MAR":"Morocco",
    "EGY":"Egypt","ZAF":"South Africa","BIH":"Bosnia","BGR":"Bulgaria","SVK":"Slovakia",
    "SVN":"Slovenia","FIN":"Finland","EST":"Estonia","LVA":"Latvia","LTU":"Lithuania",
    "IRL":"Ireland","WLS":"Wales","NIR":"N. Ireland","MNE":"Montenegro","GEO":"Georgia",
    "BLR":"Belarus","ARM":"Armenia","KAZ":"Kazakhstan","LUX":"Luxembourg","MKD":"N. Macedonia",
    "MLT":"Malta","ISL":"Iceland","AUS":"Australia"
};

function getCountryName(code) {
    return countryNames[code] || code;
}

// Extract city from "City, Country" format
function extractCity(cityField) {
    if (!cityField) return '';
    const parts = cityField.split(',');
    return parts[0].trim();
}

async function init() {
    if (typeof SharedUtils === 'undefined') {
        document.getElementById('clubs-page-content').innerHTML = '<p style="text-align:center;padding:40px;">Error loading page.</p>';
        return;
    }
    supabaseClient = SharedUtils.initSupabaseClient();
    if (!supabaseClient) return;

    await loadAllClubs();
}

async function loadAllClubs() {
    const contentDiv = document.getElementById('clubs-page-content');

    try {
        // Fetch all clubs
        const { data: clubs, error: clubsError } = await supabaseClient
            .from('clubs').select('id, name, country, city');
        if (clubsError || !clubs) {
            contentDiv.innerHTML = '<p style="text-align:center;padding:40px;">Could not load clubs.</p>';
            return;
        }

        // Fetch ALL stickers (handle Supabase 1000 limit)
        let allStickers = [];
        let offset = 0;
        while (true) {
            const { data, error } = await supabaseClient
                .from('stickers')
                .select('id, club_id, rating, image_url')
                .range(offset, offset + 999);
            if (error || !data || data.length === 0) break;
            allStickers = allStickers.concat(data);
            if (data.length < 1000) break;
            offset += 1000;
        }

        // Build stats per club
        const clubStats = {};
        allStickers.forEach(s => {
            if (!clubStats[s.club_id]) clubStats[s.club_id] = { count: 0, bestRating: 0, bestImage: null, bestStickerId: null };
            clubStats[s.club_id].count++;
            if ((s.rating || 0) > clubStats[s.club_id].bestRating) {
                clubStats[s.club_id].bestRating = s.rating || 0;
                clubStats[s.club_id].bestImage = s.image_url;
                clubStats[s.club_id].bestStickerId = s.id;
            }
        });

        // Enrich clubs and sort alphabetically by clean name
        allClubsData = clubs.map(c => ({
            id: c.id,
            name: c.name,
            cleanName: cleanClubName(c.name),
            country: c.country,
            city: extractCity(c.city),
            count: clubStats[c.id] ? clubStats[c.id].count : 0,
            bestImage: clubStats[c.id] ? clubStats[c.id].bestImage : null,
            bestStickerId: clubStats[c.id] ? clubStats[c.id].bestStickerId : null,
        })).sort((a, b) => a.cleanName.localeCompare(b.cleanName, 'en'));

        totalPages = Math.ceil(allClubsData.length / CLUBS_PER_PAGE);

        // Count unique countries
        const countries = new Set(clubs.map(c => c.country));

        // Build the page
        renderPage(clubs.length, countries.size, allStickers.length);

    } catch (err) {
        console.error('Error loading clubs:', err);
        contentDiv.innerHTML = '<p style="text-align:center;padding:40px;">Error: ' + err.message + '</p>';
    }
}

function renderPage(totalClubs, totalCountries, totalStickers) {
    const contentDiv = document.getElementById('clubs-page-content');

    // Top 10 most collected (by sticker count)
    const topClubs = [...allClubsData].sort((a, b) => b.count - a.count).slice(0, 10);

    let html = '';

    // Hero
    html += `
        <div class="cat-hero">
            <h1>Football Sticker Clubs</h1>
            <p>${totalClubs.toLocaleString()} clubs from ${totalCountries} countries in the world's football sticker database. Find your club.</p>
            <div class="cat-search">
                <input type="text" id="clubs-search-input" placeholder="Search clubs..." autocomplete="off">
                <div class="cat-search-results" id="clubs-search-results"></div>
            </div>
        </div>
        <div class="cat-quick-nav">
            <div class="cat-quick-links">
                <a href="/catalogue.html" class="cat-quick-link"><span class="cat-quick-link-icon">\u{1F5FA}\u{FE0F}</span> Catalogue</a>
                <a href="/rating.html" class="cat-quick-link"><span class="cat-quick-link-icon">\u26A1</span> Sticker Rating</a>
                <a href="/stickerlog.html" class="cat-quick-link"><span class="cat-quick-link-icon">\u{1F550}</span> Recently Added</a>
                <a href="/quiz.html" class="cat-quick-link"><span class="cat-quick-link-icon">\u{1F3AF}</span> Play Quiz</a>
            </div>
        </div>
        <hr class="cat-divider">
    `;

    // Most Collected strip
    html += `
        <div class="cat-section">
            <div class="cat-section-header">
                <h2>Most Collected</h2>
                <span class="cat-section-meta">by number of stickers</span>
            </div>
            <div class="cat-clubs-strip">
    `;
    topClubs.forEach(c => {
        const thumbUrl = c.bestImage ? SharedUtils.getThumbnailUrl(c.bestImage) : '';
        if (!thumbUrl) return;
        html += `
            <a href="/clubs/${c.id}.html" class="cat-club-card">
                <img src="${thumbUrl}" alt="${c.cleanName} sticker" data-sticker-id="${c.bestStickerId}" loading="lazy" decoding="async">
                <span class="cat-club-label">${c.cleanName}</span>
                <span class="cat-club-count">${c.count} stickers</span>
            </a>`;
    });
    html += `</div></div><hr class="cat-divider">`;

    // Club Directory
    html += `
        <div class="cat-section" id="clubs-directory">
            <div class="cat-section-header">
                <h2>Club Directory</h2>
                <span class="cat-section-meta" id="clubs-page-info">alphabetical &middot; page 1 of ${totalPages}</span>
            </div>
            <div id="clubs-table-container"></div>
            <div id="clubs-pagination"></div>
        </div>
        <hr class="cat-divider">
    `;

    // SEO text
    html += `
        <div class="cat-seo-text">
            <h2>About the Club Directory</h2>
            <p>StickerHunt tracks football stickers from clubs across the world. Germany leads with the most clubs represented, followed by Italy, Spain, the Netherlands, and France. Each club page shows all stickers found for that club, their locations on the map, and community ratings. Discover clubs from Bundesliga to Serie A, La Liga to Eredivisie, Ligue 1 to Allsvenskan, and hundreds of lower-league teams across Europe and beyond.</p>
        </div>
    `;

    contentDiv.innerHTML = html;

    // Render first page
    renderTablePage(1);

    // Setup search
    initClubsSearch();
}

function renderTablePage(page) {
    currentPage = page;
    const start = (page - 1) * CLUBS_PER_PAGE;
    const end = start + CLUBS_PER_PAGE;
    const pageClubs = allClubsData.slice(start, end);

    // Table
    let tableHtml = `
        <table class="clubs-dir-table">
            <thead><tr>
                <th>Club</th>
                <th>Country</th>
                <th class="clubs-city-col">City</th>
                <th class="clubs-count-col">Stickers</th>
            </tr></thead>
            <tbody>
    `;
    pageClubs.forEach(c => {
        const thumbUrl = c.bestImage ? SharedUtils.getThumbnailUrl(c.bestImage) : '';
        const thumbHtml = thumbUrl
            ? `<img src="${thumbUrl}" class="clubs-dir-thumb" alt="" data-sticker-id="${c.bestStickerId}" loading="lazy" decoding="async">`
            : '<span class="clubs-dir-thumb-placeholder"></span>';
        const countryName = getCountryName(c.country);

        tableHtml += `<tr>
            <td class="clubs-dir-name"><a href="/clubs/${c.id}.html">${thumbHtml}${c.name}</a></td>
            <td class="clubs-dir-country"><a href="/countries/${c.country}.html">${countryName}</a></td>
            <td class="clubs-dir-city clubs-city-col">${c.city}</td>
            <td class="clubs-dir-count clubs-count-col">${c.count}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';

    document.getElementById('clubs-table-container').innerHTML = tableHtml;

    // Pagination
    let pagHtml = '<div class="clubs-pagination">';
    pagHtml += `<span class="clubs-page-btn ${page <= 1 ? 'disabled' : ''}" data-page="${page - 1}">&larr; Prev</span>`;
    for (let i = 1; i <= totalPages; i++) {
        pagHtml += `<span class="clubs-page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</span>`;
    }
    pagHtml += `<span class="clubs-page-btn ${page >= totalPages ? 'disabled' : ''}" data-page="${page + 1}">Next &rarr;</span>`;
    pagHtml += '</div>';

    document.getElementById('clubs-pagination').innerHTML = pagHtml;
    document.getElementById('clubs-page-info').textContent = `alphabetical \u00B7 page ${page} of ${totalPages}`;

    // Bind pagination clicks
    document.querySelectorAll('.clubs-page-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', function() {
            const p = parseInt(this.dataset.page);
            if (p >= 1 && p <= totalPages) {
                renderTablePage(p);
                document.getElementById('clubs-directory').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initClubsSearch() {
    const input = document.getElementById('clubs-search-input');
    const results = document.getElementById('clubs-search-results');
    if (!input || !results) return;

    let debounceTimer;

    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

        debounceTimer = setTimeout(() => {
            const matches = allClubsData
                .filter(c => c.cleanName.toLowerCase().includes(query))
                .slice(0, 8);

            if (matches.length === 0) {
                results.innerHTML = '<div class="cat-search-item" style="color:var(--color-info-text);cursor:default;">No clubs found</div>';
            } else {
                results.innerHTML = matches.map(c =>
                    '<a href="/clubs/' + c.id + '.html" class="cat-search-item">' +
                    '<span class="cat-search-item-name">' + c.name + '</span>' +
                    '<span class="cat-search-item-meta">' + c.count + ' stickers</span></a>'
                ).join('');
            }
            results.classList.add('active');
        }, 200);
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.cat-search')) results.classList.remove('active');
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim().toLowerCase();
            if (!query) return;
            // Find first match and go there
            const match = allClubsData.find(c => c.cleanName.toLowerCase().includes(query));
            if (match) window.location.href = '/clubs/' + match.id + '.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
