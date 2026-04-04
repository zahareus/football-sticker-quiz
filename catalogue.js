// catalogue.js - Catalogue page functionality
// Uses SharedUtils from shared.js for common functionality

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
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before catalogue.js');
    const contentDiv = document.getElementById('catalogue-content');
    if (contentDiv) {
        contentDiv.innerHTML = "<p>Initialization error. Catalogue cannot be loaded.</p>";
    }
} else {
    supabaseClient = SharedUtils.initSupabaseClient();
}

// Function to update meta keywords from media field
function updateMetaKeywords(mediaString) {
    if (!mediaString) return;

    // Remove emojis and # symbols
    const cleanedText = mediaString
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/#/g, '')
        .trim();

    // Get or create meta keywords tag
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
    }

    // Append to existing keywords
    const existingKeywords = metaKeywords.content;
    if (existingKeywords) {
        metaKeywords.content = existingKeywords + ', ' + cleanedText;
    } else {
        metaKeywords.content = cleanedText;
    }
}

// Function to update canonical URL
function updateCanonicalUrl(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = url;
}

// Function to update meta description
function updateMetaDescription(description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // Also update Open Graph description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
        ogDesc.content = description;
    }
}

// Truncate long text to max length
function truncateText(text, maxLength = 25) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

const countryCodeToDetails_Generic = {
    "AFG": { name: "Afghanistan", continent: "Asia" },
    "ALB": { name: "Albania", continent: "Europe" },
    "DZA": { name: "Algeria", continent: "Africa" },
    "AND": { name: "Andorra", continent: "Europe" },
    "AGO": { name: "Angola", continent: "Africa" },
    "ARG": { name: "Argentina", continent: "South America" },
    "ARM": { name: "Armenia", continent: "Asia" },
    "AUS": { name: "Australia", continent: "Oceania" },
    "AUT": { name: "Austria", continent: "Europe" },
    "AZE": { name: "Azerbaijan", continent: "Asia" },
    "BHS": { name: "Bahamas", continent: "North America" },
    "BHR": { name: "Bahrain", continent: "Asia" },
    "BGD": { name: "Bangladesh", continent: "Asia" },
    "BLR": { name: "Belarus", continent: "Europe" },
    "BEL": { name: "Belgium", continent: "Europe" },
    "BLZ": { name: "Belize", continent: "North America" },
    "BEN": { name: "Benin", continent: "Africa" },
    "BOL": { name: "Bolivia", continent: "South America" },
    "BIH": { name: "Bosnia and Herzegovina", continent: "Europe" },
    "BWA": { name: "Botswana", continent: "Africa" },
    "BRA": { name: "Brazil", continent: "South America" },
    "BGR": { name: "Bulgaria", continent: "Europe" },
    "BFA": { name: "Burkina Faso", continent: "Africa" },
    "KHM": { name: "Cambodia", continent: "Asia" },
    "CMR": { name: "Cameroon", continent: "Africa" },
    "CAN": { name: "Canada", continent: "North America" },
    "CPV": { name: "Cape Verde", continent: "Africa" },
    "CAF": { name: "Central African Republic", continent: "Africa" },
    "TCD": { name: "Chad", continent: "Africa" },
    "CHL": { name: "Chile", continent: "South America" },
    "CHN": { name: "China", continent: "Asia" },
    "COL": { name: "Colombia", continent: "South America" },
    "COG": { name: "Congo", continent: "Africa" },
    "CRI": { name: "Costa Rica", continent: "North America" },
    "HRV": { name: "Croatia", continent: "Europe" },
    "CUB": { name: "Cuba", continent: "North America" },
    "CYP": { name: "Cyprus", continent: "Europe" },
    "CZE": { name: "Czech Republic", continent: "Europe" },
    "DNK": { name: "Denmark", continent: "Europe" },
    "DJI": { name: "Djibouti", continent: "Africa" },
    "DOM": { name: "Dominican Republic", continent: "North America" },
    "ECU": { name: "Ecuador", continent: "South America" },
    "EGY": { name: "Egypt", continent: "Africa" },
    "SLV": { name: "El Salvador", continent: "North America" },
    "GNQ": { name: "Equatorial Guinea", continent: "Africa" },
    "EST": { name: "Estonia", continent: "Europe" },
    "ETH": { name: "Ethiopia", continent: "Africa" },
    "FJI": { name: "Fiji", continent: "Oceania" },
    "FIN": { name: "Finland", continent: "Europe" },
    "FRA": { name: "France", continent: "Europe" },
    "GAB": { name: "Gabon", continent: "Africa" },
    "GMB": { name: "Gambia", continent: "Africa" },
    "GEO": { name: "Georgia", continent: "Europe" },
    "DEU": { name: "Germany", continent: "Europe" },
    "GHA": { name: "Ghana", continent: "Africa" },
    "GRC": { name: "Greece", continent: "Europe" },
    "GTM": { name: "Guatemala", continent: "North America" },
    "GIN": { name: "Guinea", continent: "Africa" },
    "HTI": { name: "Haiti", continent: "North America" },
    "HND": { name: "Honduras", continent: "North America" },
    "HUN": { name: "Hungary", continent: "Europe" },
    "ISL": { name: "Iceland", continent: "Europe" },
    "IND": { name: "India", continent: "Asia" },
    "IDN": { name: "Indonesia", continent: "Asia" },
    "IRN": { name: "Iran", continent: "Asia" },
    "IRQ": { name: "Iraq", continent: "Asia" },
    "IRL": { name: "Ireland", continent: "Europe" },
    "ISR": { name: "Israel", continent: "Asia" },
    "ITA": { name: "Italy", continent: "Europe" },
    "CIV": { name: "Ivory Coast", continent: "Africa" },
    "JAM": { name: "Jamaica", continent: "North America" },
    "JPN": { name: "Japan", continent: "Asia" },
    "JOR": { name: "Jordan", continent: "Asia" },
    "KAZ": { name: "Kazakhstan", continent: "Europe" },
    "KEN": { name: "Kenya", continent: "Africa" },
    "KWT": { name: "Kuwait", continent: "Asia" },
    "KGZ": { name: "Kyrgyzstan", continent: "Asia" },
    "LVA": { name: "Latvia", continent: "Europe" },
    "LBN": { name: "Lebanon", continent: "Asia" },
    "LBR": { name: "Liberia", continent: "Africa" },
    "LBY": { name: "Libya", continent: "Africa" },
    "LIE": { name: "Liechtenstein", continent: "Europe" },
    "LTU": { name: "Lithuania", continent: "Europe" },
    "LUX": { name: "Luxembourg", continent: "Europe" },
    "MKD": { name: "North Macedonia", continent: "Europe" },
    "MDG": { name: "Madagascar", continent: "Africa" },
    "MWI": { name: "Malawi", continent: "Africa" },
    "MYS": { name: "Malaysia", continent: "Asia" },
    "MLI": { name: "Mali", continent: "Africa" },
    "MLT": { name: "Malta", continent: "Europe" },
    "MRT": { name: "Mauritania", continent: "Africa" },
    "MEX": { name: "Mexico", continent: "North America" },
    "MDA": { name: "Moldova", continent: "Europe" },
    "MCO": { name: "Monaco", continent: "Europe" },
    "MNG": { name: "Mongolia", continent: "Asia" },
    "MNE": { name: "Montenegro", continent: "Europe" },
    "MAR": { name: "Morocco", continent: "Africa" },
    "MOZ": { name: "Mozambique", continent: "Africa" },
    "NPL": { name: "Nepal", continent: "Asia" },
    "NLD": { name: "Netherlands", continent: "Europe" },
    "NZL": { name: "New Zealand", continent: "Oceania" },
    "NIC": { name: "Nicaragua", continent: "North America" },
    "NER": { name: "Niger", continent: "Africa" },
    "NGA": { name: "Nigeria", continent: "Africa" },
    "PRK": { name: "North Korea", continent: "Asia" },
    "NOR": { name: "Norway", continent: "Europe" },
    "OMN": { name: "Oman", continent: "Asia" },
    "PAK": { name: "Pakistan", continent: "Asia" },
    "PAN": { name: "Panama", continent: "North America" },
    "PNG": { name: "Papua New Guinea", continent: "Oceania" },
    "PRY": { name: "Paraguay", continent: "South America" },
    "PER": { name: "Peru", continent: "South America" },
    "PHL": { name: "Philippines", continent: "Asia" },
    "POL": { name: "Poland", continent: "Europe" },
    "PRT": { name: "Portugal", continent: "Europe" },
    "QAT": { name: "Qatar", continent: "Asia" },
    "ROU": { name: "Romania", continent: "Europe" },
    "RUS": { name: "Russia", continent: "Europe" },
    "RWA": { name: "Rwanda", continent: "Africa" },
    "SAU": { name: "Saudi Arabia", continent: "Asia" },
    "SEN": { name: "Senegal", continent: "Africa" },
    "SRB": { name: "Serbia", continent: "Europe" },
    "SLE": { name: "Sierra Leone", continent: "Africa" },
    "SGP": { name: "Singapore", continent: "Asia" },
    "SVK": { name: "Slovakia", continent: "Europe" },
    "SVN": { name: "Slovenia", continent: "Europe" },
    "SOM": { name: "Somalia", continent: "Africa" },
    "ZAF": { name: "South Africa", continent: "Africa" },
    "KOR": { name: "South Korea", continent: "Asia" },
    "ESP": { name: "Spain", continent: "Europe" },
    "LKA": { name: "Sri Lanka", continent: "Asia" },
    "SDN": { name: "Sudan", continent: "Africa" },
    "SWE": { name: "Sweden", continent: "Europe" },
    "CHE": { name: "Switzerland", continent: "Europe" },
    "SYR": { name: "Syria", continent: "Asia" },
    "TWN": { name: "Taiwan", continent: "Asia" },
    "TZA": { name: "Tanzania", continent: "Africa" },
    "THA": { name: "Thailand", continent: "Asia" },
    "TGO": { name: "Togo", continent: "Africa" },
    "TUN": { name: "Tunisia", continent: "Africa" },
    "TUR": { name: "Turkey", continent: "Europe" },
    "UGA": { name: "Uganda", continent: "Africa" },
    "UKR": { name: "Ukraine", continent: "Europe" },
    "ARE": { name: "United Arab Emirates", continent: "Asia" },
    "GBR": { name: "United Kingdom", continent: "Europe" },
    "USA": { name: "United States", continent: "North America" },
    "URY": { name: "Uruguay", continent: "South America" },
    "UZB": { name: "Uzbekistan", continent: "Asia" },
    "VEN": { name: "Venezuela", continent: "South America" },
    "VNM": { name: "Vietnam", continent: "Asia" },
    "YEM": { name: "Yemen", continent: "Asia" },
    "ZMB": { name: "Zambia", continent: "Africa" },
    "ZWE": { name: "Zimbabwe", continent: "Africa" },
    "ENG": { name: "England", continent: "Europe" },
    "SCO": { name: "Scotland", continent: "Europe" },
    "WLS": { name: "Wales", continent: "Europe" },
    "NIR": { name: "Northern Ireland", continent: "Europe" },
};

const countryCodeToFlagEmoji = {
    "AFG": "🇦🇫", "ALB": "🇦🇱", "DZA": "🇩🇿", "AND": "🇦🇩", "AGO": "🇦🇴", "ARG": "🇦🇷", "ARM": "🇦🇲",
    "AUS": "🇦🇺", "AUT": "🇦🇹", "AZE": "🇦🇿", "BHS": "🇧🇸", "BHR": "🇧🇭", "BGD": "🇧🇩", "BLR": "🇧🇾",
    "BEL": "🇧🇪", "BLZ": "🇧🇿", "BEN": "🇧🇯", "BOL": "🇧🇴", "BIH": "🇧🇦", "BWA": "🇧🇼", "BRA": "🇧🇷",
    "BGR": "🇧🇬", "BFA": "🇧🇫", "KHM": "🇰🇭", "CMR": "🇨🇲", "CAN": "🇨🇦", "CPV": "🇨🇻", "CAF": "🇨🇫",
    "TCD": "🇹🇩", "CHL": "🇨🇱", "CHN": "🇨🇳", "COL": "🇨🇴", "COG": "🇨🇬", "CRI": "🇨🇷", "HRV": "🇭🇷",
    "CUB": "🇨🇺", "CYP": "🇨🇾", "CZE": "🇨🇿", "DNK": "🇩🇰", "DJI": "🇩🇯", "DOM": "🇩🇴", "ECU": "🇪🇨",
    "EGY": "🇪🇬", "SLV": "🇸🇻", "GNQ": "🇬🇶", "EST": "🇪🇪", "ETH": "🇪🇹", "FJI": "🇫🇯", "FIN": "🇫🇮",
    "FRA": "🇫🇷", "GAB": "🇬🇦", "GMB": "🇬🇲", "GEO": "🇬🇪", "DEU": "🇩🇪", "GHA": "🇬🇭", "GRC": "🇬🇷",
    "GTM": "🇬🇹", "GIN": "🇬🇳", "HTI": "🇭🇹", "HND": "🇭🇳", "HUN": "🇭🇺", "ISL": "🇮🇸", "IND": "🇮🇳",
    "IDN": "🇮🇩", "IRN": "🇮🇷", "IRQ": "🇮🇶", "IRL": "🇮🇪", "ISR": "🇮🇱", "ITA": "🇮🇹", "CIV": "🇨🇮",
    "JAM": "🇯🇲", "JPN": "🇯🇵", "JOR": "🇯🇴", "KAZ": "🇰🇿", "KEN": "🇰🇪", "KWT": "🇰🇼", "KGZ": "🇰🇬",
    "LVA": "🇱🇻", "LBN": "🇱🇧", "LBR": "🇱🇷", "LBY": "🇱🇾", "LIE": "🇱🇮", "LTU": "🇱🇹", "LUX": "🇱🇺",
    "MKD": "🇲🇰", "MDG": "🇲🇬", "MWI": "🇲🇼", "MYS": "🇲🇾", "MLI": "🇲🇱", "MLT": "🇲🇹", "MRT": "🇲🇷",
    "MEX": "🇲🇽", "MDA": "🇲🇩", "MCO": "🇲🇨", "MNG": "🇲🇳", "MNE": "🇲🇪", "MAR": "🇲🇦", "MOZ": "🇲🇿",
    "NPL": "🇳🇵", "NLD": "🇳🇱", "NZL": "🇳🇿", "NIC": "🇳🇮", "NER": "🇳🇪", "NGA": "🇳🇬", "PRK": "🇰🇵",
    "NOR": "🇳🇴", "OMN": "🇴🇲", "PAK": "🇵🇰", "PAN": "🇵🇦", "PNG": "🇵🇬", "PRY": "🇵🇾", "PER": "🇵🇪",
    "PHL": "🇵🇭", "POL": "🇵🇱", "PRT": "🇵🇹", "QAT": "🇶🇦", "ROU": "🇷🇴", "RUS": "🇷🇺", "RWA": "🇷🇼",
    "SAU": "🇸🇦", "SEN": "🇸🇳", "SRB": "🇷🇸", "SLE": "🇸🇱", "SGP": "🇸🇬", "SVK": "🇸🇰", "SVN": "🇸🇮",
    "SOM": "🇸🇴", "ZAF": "🇿🇦", "KOR": "🇰🇷", "ESP": "🇪🇸", "LKA": "🇱🇰", "SDN": "🇸🇩", "SWE": "🇸🇪",
    "CHE": "🇨🇭", "SYR": "🇸🇾", "TWN": "🇹🇼", "TZA": "🇹🇿", "THA": "🇹🇭", "TGO": "🇹🇬", "TUN": "🇹🇳",
    "TUR": "🇹🇷", "UGA": "🇺🇬", "UKR": "🇺🇦", "ARE": "🇦🇪", "GBR": "🇬🇧", "USA": "🇺🇸", "URY": "🇺🇾",
    "UZB": "🇺🇿", "VEN": "🇻🇪", "VNM": "🇻🇳", "YEM": "🇾🇪", "ZMB": "🇿🇲", "ZWE": "🇿🇼",
    "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "SCO": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "NIR": "🇬🇧"
};

let totalCountriesInCatalogue = 0;

async function updateTotalCountriesCount() {
    if (!supabaseClient) return;
    try {
        const { data: allClubs, error: allClubsError } = await supabaseClient.from('clubs').select('country');
        if (allClubsError) {
            console.error("Error fetching all clubs for total country count:", allClubsError);
            return;
        }
        if (allClubs) {
            const distinctCountries = new Set(allClubs.map(c => c.country));
            totalCountriesInCatalogue = distinctCountries.size;
        }
    } catch (e) {
        console.error("Error calculating total countries", e);
    }
}

/**
 * Load most collected clubs with their best-rated sticker thumbnail
 * @returns {string} - HTML string for popular clubs strip
 */
async function loadMostCollectedClubs() {
    if (!supabaseClient) return '';

    try {
        // Get all stickers with club info and rating
        const { data: stickers, error } = await supabaseClient
            .from('stickers')
            .select('id, image_url, rating, club_id, clubs(id, name, country)')
            .not('image_url', 'is', null);

        if (error || !stickers || stickers.length === 0) return '';

        // Count stickers per club and find best-rated sticker for each
        const clubMap = {};
        stickers.forEach(s => {
            const clubId = s.club_id;
            if (!clubId || !s.clubs) return;
            if (!clubMap[clubId]) {
                clubMap[clubId] = { club: s.clubs, count: 0, bestSticker: s };
            }
            clubMap[clubId].count++;
            if ((s.rating || 0) > (clubMap[clubId].bestSticker.rating || 0)) {
                clubMap[clubId].bestSticker = s;
            }
        });

        // Sort by sticker count, take top 10
        const topClubs = Object.values(clubMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        let html = '';
        topClubs.forEach(({ club, count, bestSticker }) => {
            const thumbUrl = SharedUtils.getThumbnailUrl(bestSticker.image_url);
            html += `
                <a href="/clubs/${club.id}.html" class="cat-club-card">
                    <img src="${thumbUrl}" alt="${club.name} sticker" loading="lazy" decoding="async">
                    <span class="cat-club-label">${club.name}</span>
                    <span class="cat-club-count">${count} sticker${count !== 1 ? 's' : ''}</span>
                </a>`;
        });

        return html;
    } catch (e) {
        console.error('Error loading most collected clubs:', e);
        return '';
    }
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

        await updateTotalCountriesCount();
        routeContent();
    } else {
        console.error('Supabase client failed to initialize. Catalogue functionality will be limited.');
        const contentDiv = document.getElementById('catalogue-content');
        const breadcrumbsDiv = document.getElementById('catalogue-breadcrumbs');
        if (contentDiv) contentDiv.innerHTML = "<p>Initialization error. Catalogue cannot be loaded.</p>";
        if (breadcrumbsDiv) breadcrumbsDiv.innerHTML = "";
    }
});

function updateBreadcrumbs(crumbs = []) {
    const breadcrumbsDiv = document.getElementById('catalogue-breadcrumbs');
    if (!breadcrumbsDiv) return;

    if (crumbs.length === 0) {
        breadcrumbsDiv.innerHTML = '';
        breadcrumbsDiv.style.display = 'none';
        return;
    }

    let html = '<nav aria-label="breadcrumb"><ol class="breadcrumb-list">';
    crumbs.forEach((crumb) => {
        html += `<li class="breadcrumb-item">`;
        if (crumb.link) {
            html += `<a href="${crumb.link}">${crumb.text}</a>`;
        } else {
            html += `<span>${crumb.text}</span>`;
        }
        html += `</li>`;
    });
    html += '</ol></nav>';
    breadcrumbsDiv.innerHTML = html;
    breadcrumbsDiv.style.display = 'block';
}

function routeContent() {
    const params = new URLSearchParams(window.location.search);
    const countryCode = params.get('country');
    const clubId = params.get('club_id');
    const stickerId = params.get('sticker_id');
    const mainHeading = document.getElementById('main-catalogue-heading');

    if (!mainHeading) {
        console.error("Main heading H1 for catalogue not found!");
        return;
    }

    if (stickerId) {
        mainHeading.textContent = "Sticker Details";
        mainHeading.style.display = '';
        document.getElementById('catalogue-container').classList.add('container');
        loadStickerDetails(stickerId);
    } else if (clubId) {
        mainHeading.textContent = "Club Sticker Gallery";
        mainHeading.style.display = '';
        document.getElementById('catalogue-container').classList.add('container');
        loadClubDetails(clubId);
    } else if (countryCode) {
        const countryInfo = countryCodeToDetails_Generic[countryCode.toUpperCase()];
        const flagEmoji = countryCodeToFlagEmoji[countryCode.toUpperCase()] || '';
        mainHeading.textContent = countryInfo ? `${flagEmoji} ${countryInfo.name} - Clubs` : `${flagEmoji} Clubs from ${countryCode}`;
        mainHeading.style.display = '';
        document.getElementById('catalogue-container').classList.add('container');
        loadCountryDetails(countryCode.toUpperCase());
    } else {
        // Main catalogue page - custom layout, no container class
        mainHeading.style.display = 'none';
        loadContinentsAndCountries();
    }
}

async function loadContinentsAndCountries() {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = '<p style="text-align:center;padding:40px;">Loading catalogue...</p>';
    updateBreadcrumbs([]);

    // Set canonical and meta for main catalogue page
    updateCanonicalUrl('https://stickerhunt.club/catalogue.html');
    document.title = 'Football Sticker Catalogue -- Browse by Country | StickerHunt';

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized.</p>';
        return;
    }
    try {
        // Fetch clubs and sticker counts per country in parallel
        const [clubsResult, stickersResult, clubsStripHtml] = await Promise.all([
            supabaseClient.from('clubs').select('id, country'),
            supabaseClient.from('stickers').select('club_id'),
            loadMostCollectedClubs()
        ]);

        const clubs = clubsResult.data;
        const clubsError = clubsResult.error;

        if (clubsError || !clubs || clubs.length === 0) {
            contentDiv.innerHTML = '<p>Could not load catalogue data.</p>';
            return;
        }

        // Count stickers per club
        const stickerCountByClub = {};
        if (stickersResult.data) {
            stickersResult.data.forEach(s => {
                stickerCountByClub[s.club_id] = (stickerCountByClub[s.club_id] || 0) + 1;
            });
        }
        const totalStickers = stickersResult.data ? stickersResult.data.length : 0;

        updateMetaDescription(`Browse ${totalStickers.toLocaleString()} football stickers from ${clubs.length} clubs across ${totalCountriesInCatalogue} countries. Find any club, country, or city.`);

        // Group clubs by country with sticker counts
        const countryData = {};
        clubs.forEach(club => {
            if (!club.country) return;
            const code = club.country.toUpperCase();
            if (!countryData[code]) {
                countryData[code] = { clubCount: 0, stickerCount: 0 };
            }
            countryData[code].clubCount++;
            countryData[code].stickerCount += stickerCountByClub[club.id] || 0;
        });

        // Group by continent
        const continents = {};
        for (const code in countryData) {
            const detail = countryCodeToDetails_Generic[code];
            const continentName = detail ? detail.continent : 'Other';
            const countryName = detail ? detail.name : code;
            if (!continents[continentName]) continents[continentName] = [];
            continents[continentName].push({
                code, name: countryName,
                clubCount: countryData[code].clubCount,
                stickerCount: countryData[code].stickerCount
            });
        }

        // --- Build page HTML ---

        // Hero
        let html = `
            <div class="cat-hero">
                <h1>Football Sticker Catalogue</h1>
                <p>Browse ${totalStickers.toLocaleString()} stickers from ${clubs.length} clubs across ${totalCountriesInCatalogue} countries. Find any club, country, or city.</p>
                <div class="cat-search">
                    <input type="text" id="cat-search-input" placeholder="Search clubs, countries, or cities..." autocomplete="off">
                    <div class="cat-search-results" id="cat-search-results"></div>
                </div>
            </div>
        `;

        // Quick navigation links
        html += `
            <div class="cat-quick-nav">
                <div class="cat-quick-links">
                    <a href="/map.html" class="cat-quick-link"><span class="cat-quick-link-icon">&#x1f5fa;&#xfe0f;</span> Interactive Map</a>
                    <a href="/rating.html" class="cat-quick-link"><span class="cat-quick-link-icon">&#x26a1;</span> Sticker Rating</a>
                    <a href="/stickerlog.html" class="cat-quick-link"><span class="cat-quick-link-icon">&#x1f550;</span> Recently Added</a>
                    <a href="/quiz.html" class="cat-quick-link"><span class="cat-quick-link-icon">&#x1f3af;</span> Play Quiz</a>
                </div>
            </div>
            <hr class="cat-divider">
        `;

        // Most Collected Clubs strip
        if (clubsStripHtml) {
            html += `
                <div class="cat-section">
                    <div class="cat-section-header">
                        <h2>Most Collected Clubs</h2>
                        <a href="/clubs.html" class="cat-section-link">All ${clubs.length} Clubs &rarr;</a>
                    </div>
                    <div class="cat-clubs-strip">${clubsStripHtml}</div>
                </div>
                <hr class="cat-divider">
            `;
        }

        // Countries by continent
        html += `
            <div class="cat-section">
                <div class="cat-section-header">
                    <h2>Browse by Country</h2>
                    <span class="cat-section-meta">${totalCountriesInCatalogue} countries</span>
                </div>
        `;

        const continentOrder = ['Europe', 'South America', 'North America', 'Asia', 'Africa', 'Oceania', 'Other'];
        const sortedContinents = Object.keys(continents).sort((a, b) => {
            const ia = continentOrder.indexOf(a);
            const ib = continentOrder.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        sortedContinents.forEach(continentName => {
            const countries = continents[continentName].sort((a, b) => b.stickerCount - a.stickerCount);
            html += `<div class="cat-continent"><h3>${continentName}</h3><div class="cat-country-grid">`;
            countries.forEach(country => {
                const flag = countryCodeToFlagEmoji[country.code] || '';
                html += `
                    <a href="/countries/${country.code}.html" class="cat-country-card">
                        <span class="cat-country-flag">${flag}</span>
                        <div class="cat-country-info">
                            <span class="cat-country-name">${country.name}</span>
                            <span class="cat-country-meta">${country.clubCount} club${country.clubCount !== 1 ? 's' : ''} &middot; ${country.stickerCount.toLocaleString()} sticker${country.stickerCount !== 1 ? 's' : ''}</span>
                        </div>
                    </a>`;
            });
            html += `</div></div>`;
        });

        html += `</div><hr class="cat-divider">`;

        // Browse by City (static top cities from homepage data)
        html += `
            <div class="cat-section">
                <div class="cat-section-header">
                    <h2>Browse by City</h2>
                    <a href="/cities/" class="cat-section-link">All Cities &rarr;</a>
                </div>
                <div class="cat-city-grid">
                    <a href="/cities/amsterdam.html" class="cat-city-card"><span class="cat-city-name">Amsterdam</span><span class="cat-city-count">172 stickers</span></a>
                    <a href="/cities/stuttgart.html" class="cat-city-card"><span class="cat-city-name">Stuttgart</span><span class="cat-city-count">88 stickers</span></a>
                    <a href="/cities/brussels.html" class="cat-city-card"><span class="cat-city-name">Brussels</span><span class="cat-city-count">78 stickers</span></a>
                    <a href="/cities/prague.html" class="cat-city-card"><span class="cat-city-name">Prague</span><span class="cat-city-count">71 stickers</span></a>
                    <a href="/cities/torrevieja.html" class="cat-city-card"><span class="cat-city-name">Torrevieja</span><span class="cat-city-count">64 stickers</span></a>
                    <a href="/cities/maastricht.html" class="cat-city-card"><span class="cat-city-name">Maastricht</span><span class="cat-city-count">62 stickers</span></a>
                    <a href="/cities/the-hague.html" class="cat-city-card"><span class="cat-city-name">The Hague</span><span class="cat-city-count">58 stickers</span></a>
                    <a href="/cities/delft.html" class="cat-city-card"><span class="cat-city-name">Delft</span><span class="cat-city-count">49 stickers</span></a>
                    <a href="/cities/santiago-de-compostela.html" class="cat-city-card"><span class="cat-city-name">Santiago de Compostela</span><span class="cat-city-count">45 stickers</span></a>
                    <a href="/cities/nantes.html" class="cat-city-card"><span class="cat-city-name">Nantes</span><span class="cat-city-count">41 stickers</span></a>
                    <a href="/cities/cartagena.html" class="cat-city-card"><span class="cat-city-name">Cartagena</span><span class="cat-city-count">40 stickers</span></a>
                    <a href="/cities/seville.html" class="cat-city-card"><span class="cat-city-name">Seville</span><span class="cat-city-count">39 stickers</span></a>
                </div>
            </div>
            <hr class="cat-divider">
        `;

        // SEO content block
        html += `
            <div class="cat-seo-text">
                <h2>About the Football Sticker Catalogue</h2>
                <p>StickerHunt maintains the world's largest database of fan-spotted football stickers found on streets, walls, and lampposts. Our catalogue covers ${clubs.length} clubs from ${totalCountriesInCatalogue} countries, with Germany, Spain, and France leading the collection. Each sticker is geotagged and linked to its club, making StickerHunt a unique resource for football culture enthusiasts, sticker collectors, and ultras researchers. Browse by country, city, or use the search to find specific clubs.</p>
            </div>
        `;

        contentDiv.innerHTML = html;

        // Initialize search autocomplete
        initCatalogueSearch();

    } catch (error) {
        console.error('An error occurred while loading countries:', error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

/**
 * Initialize search autocomplete on catalogue page
 */
function initCatalogueSearch() {
    const input = document.getElementById('cat-search-input');
    const results = document.getElementById('cat-search-results');
    if (!input || !results) return;

    let debounceTimer;

    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

        debounceTimer = setTimeout(async () => {
            if (!supabaseClient) return;
            try {
                const { data: clubs } = await supabaseClient.from('clubs').select('id, name, country').ilike('name', '%' + query + '%').limit(6);
                if (!clubs || clubs.length === 0) {
                    results.innerHTML = '<div class="cat-search-item" style="color: var(--color-info-text); cursor: default;">No clubs found</div>';
                    results.classList.add('active');
                    return;
                }
                results.innerHTML = clubs.map(c =>
                    '<a href="/clubs/' + c.id + '.html" class="cat-search-item">' +
                    '<span class="cat-search-item-name">' + c.name + '</span>' +
                    '<span class="cat-search-item-meta">' + (c.country || '') + '</span></a>'
                ).join('');
                results.classList.add('active');
            } catch(e) { console.error('Search error:', e); }
        }, 300);
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim();
            if (query) window.location.href = '/catalogue.html?search=' + encodeURIComponent(query);
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.cat-search')) results.classList.remove('active');
    });

    // Handle ?search= parameter
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');
    if (searchQuery) {
        input.value = searchQuery;
        input.dispatchEvent(new Event('input'));
    }
}

async function loadCountryDetails(countryCode) {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = `<p>Loading clubs...</p>`;

    updateBreadcrumbs([
        { text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' }
    ]);

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }

    try {
        const { data: clubsInCountry, error: clubsError } = await supabaseClient
            .from('clubs')
            .select('id, name, country')
            .eq('country', countryCode);

        let contentBodyHtml = '';

        if (clubsError) {
            console.error(`Error fetching clubs for ${countryCode}:`, clubsError);
            const countryInfo = countryCodeToDetails_Generic[countryCode];
            const countryDisplayName = countryInfo ? countryInfo.name : countryCode;
            contentBodyHtml = `<p>Could not load clubs for ${countryDisplayName}: ${clubsError.message}</p>`;
        } else if (!clubsInCountry || clubsInCountry.length === 0) {
            const countryInfo = countryCodeToDetails_Generic[countryCode];
            const countryDisplayName = countryInfo ? countryInfo.name : countryCode;
            contentBodyHtml = `<p>No clubs found for ${countryDisplayName} in the catalogue.</p>`;
        } else {
            // Update page title with country name
            const countryInfo = countryCodeToDetails_Generic[countryCode];
            const countryDisplayName = countryInfo ? countryInfo.name : countryCode;
            document.title = `${countryDisplayName} - Sticker Catalogue`;
            updateCanonicalUrl(`https://stickerhunt.club/countries/${countryCode.toUpperCase()}.html`);
            updateMetaDescription(`Browse ${clubsInCountry.length} football clubs from ${countryDisplayName} in our sticker database. Explore club stickers and discover the complete collection.`);

            // Get all club IDs to fetch sticker counts in one query
            const clubIds = clubsInCountry.map(club => club.id);

            // Fetch all stickers for all clubs in this country in ONE query
            const { data: stickersData, error: stickersError } = await supabaseClient
                .from('stickers')
                .select('club_id')
                .in('club_id', clubIds);

            // Count stickers per club
            const stickerCountsByClub = {};
            if (!stickersError && stickersData) {
                stickersData.forEach(sticker => {
                    if (!stickerCountsByClub[sticker.club_id]) {
                        stickerCountsByClub[sticker.club_id] = 0;
                    }
                    stickerCountsByClub[sticker.club_id]++;
                });
            }

            // Add sticker counts to clubs
            const clubsWithStickerCounts = clubsInCountry.map(club => ({
                ...club,
                stickerCount: stickerCountsByClub[club.id] || 0
            }));

            clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));
            let clubListHtml = '<ul class="club-list">';
            clubsWithStickerCounts.forEach(club => {
                const countText = `(${club.stickerCount} sticker${club.stickerCount !== 1 ? 's' : ''})`;
                clubListHtml += `<li><a href="/clubs/${club.id}.html">${club.name} ${countText}</a></li>`;
            });
            clubListHtml += '</ul>';
            contentBodyHtml = clubListHtml;
        }
        contentDiv.innerHTML = contentBodyHtml;
    } catch (error) {
        console.error(`An error occurred while loading clubs for ${countryCode}:`, error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}. Please check the console for more details.</p>`;
    }
}

async function loadClubDetails(clubId) {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = `<p>Loading club stickers...</p>`;
    const mainHeading = document.getElementById('main-catalogue-heading');
    updateBreadcrumbs([]);

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }

    try {
        const { data: clubData, error: clubError } = await supabaseClient
            .from('clubs')
            .select('id, name, country, city, web, media')
            .eq('id', clubId)
            .single();

        let contentBodyHtml = '';

        if (clubError || !clubData) {
            console.error(`Error fetching club details for ID ${clubId}:`, clubError);
            if (mainHeading) mainHeading.textContent = "Club Not Found";
            contentBodyHtml = `<p>Could not load club details. The club may not exist.</p>`;
            updateBreadcrumbs([{ text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' }]);
            contentDiv.innerHTML = contentBodyHtml;
        } else {
            const countryInfo = countryCodeToDetails_Generic[clubData.country.toUpperCase()];
            const countryDisplayName = countryInfo ? countryInfo.name : clubData.country;

            if (mainHeading) mainHeading.textContent = `${clubData.name} - Sticker Gallery`;
            document.title = `${clubData.name} - ${countryDisplayName} - Sticker Catalogue`;
            updateCanonicalUrl(`https://stickerhunt.club/clubs/${clubId}.html`);

            // Update meta keywords from media field
            if (clubData.media) {
                updateMetaKeywords(clubData.media);
            }

            const { count: totalClubsInCountry } = await supabaseClient
                .from('clubs')
                .select('*', { count: 'exact', head: true })
                .eq('country', clubData.country);

            updateBreadcrumbs([
                { text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' },
                { text: `All clubs from ${countryDisplayName} (${totalClubsInCountry || 0})`, link: `/countries/${clubData.country.toUpperCase()}.html` }
            ]);

            const { data: stickersResponse, error: stickersError } = await supabaseClient
                .from('stickers')
                .select('id, image_url, latitude, longitude')
                .eq('club_id', clubId)
                .order('id', { ascending: true });

            // Update meta description with sticker count
            const stickerCount = stickersResponse ? stickersResponse.length : 0;
            updateMetaDescription(`View ${stickerCount} stickers from ${clubData.name} (${countryDisplayName}) in our football sticker collection.`);

            // Display club info blocks
            let clubInfoHtml = '<div class="club-info-section">';
            if (clubData.city) {
                clubInfoHtml += `<p class="club-info-item">🌍 ${clubData.city}</p>`;
            }
            if (clubData.web) {
                // Sanitize URL to prevent XSS
                const sanitizedUrl = encodeURI(clubData.web);
                clubInfoHtml += `<p class="club-info-item">🌐 <a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer">${clubData.web}</a></p>`;
            }
            if (clubData.media) {
                clubInfoHtml += `<p class="club-info-item">#️⃣ ${clubData.media}</p>`;
            }
            clubInfoHtml += '</div>';

            // Check if any stickers have coordinates for the map
            const stickersWithCoordinates = stickersResponse ? stickersResponse.filter(
                s => s.latitude != null && s.longitude != null
            ) : [];

            if (stickersError) {
                console.error(`Error fetching stickers for club ID ${clubId}:`, stickersError);
                contentBodyHtml = clubInfoHtml + `<p>Could not load stickers for this club: ${stickersError.message}</p>`;
            } else if (!stickersResponse || stickersResponse.length === 0) {
                contentBodyHtml = clubInfoHtml + '<p>No stickers found for this club.</p>';
            } else {
                let galleryHtml = '<div class="sticker-gallery">';
                stickersResponse.forEach(sticker => {
                    // Use optimized thumbnail URL with lazy loading for faster page load
                    const thumbnailUrl = SharedUtils.getThumbnailUrl(sticker.image_url);
                    galleryHtml += `
                        <a href="/stickers/${sticker.id}.html" class="sticker-preview-link">
                            <img src="${thumbnailUrl}"
                                 alt="Sticker ID ${sticker.id} for ${clubData.name}"
                                 class="sticker-preview-image"
                                 loading="lazy"
                                 decoding="async">
                        </a>`;
                });
                galleryHtml += '</div>';

                // Add map section if there are stickers with coordinates
                let clubMapHtml = '';
                if (stickersWithCoordinates.length > 0) {
                    clubMapHtml = `
                        <div class="club-map-section">
                            <h3 class="club-map-heading">Sticker Locations</h3>
                            <div id="club-map" class="club-map-container"></div>
                            <div class="view-map-btn-container">
                                <a href="/map.html" class="btn btn-nav">View Full Map</a>
                            </div>
                        </div>
                    `;
                }

                contentBodyHtml = clubInfoHtml + galleryHtml + clubMapHtml;
            }

            contentDiv.innerHTML = contentBodyHtml;

            // Initialize club map if there are stickers with coordinates
            if (stickersWithCoordinates && stickersWithCoordinates.length > 0) {
                initializeClubMap(stickersWithCoordinates, clubData.name);
            }
        }
    } catch (error) {
        console.error(`An error occurred while loading club details for ID ${clubId}:`, error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

async function loadStickerDetails(stickerId) {
    const contentDiv = document.getElementById('catalogue-content');
    const mainHeading = document.getElementById('main-catalogue-heading');

    contentDiv.innerHTML = `<p>Loading sticker details...</p>`;
    updateBreadcrumbs([]);

    if (!supabaseClient) {
        if (mainHeading) mainHeading.textContent = "Error";
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }

    try {
        const { data: sticker, error: stickerError } = await supabaseClient
            .from('stickers')
            .select(`
                id,
                image_url,
                difficulty,
                location,
                description,
                latitude,
                longitude,
                found,
                club_id,
                clubs (id, name, country, media)
            `)
            .eq('id', stickerId)
            .single();

        let contentBodyHtml = '';

        // Initialize navigation variables outside of conditional blocks
        let prevStickerId = null;
        let nextStickerId = null;

        if (stickerError || !sticker) {
            console.error(`Error fetching sticker details for ID ${stickerId}:`, stickerError);
            if (mainHeading) mainHeading.textContent = "Sticker Not Found";
            contentBodyHtml = `<p>Could not load sticker details. The sticker may not exist or there was an error.</p>`;
            if (stickerError && stickerError.message) contentBodyHtml += `<p><em>Error: ${stickerError.message}</em></p>`;
            updateBreadcrumbs([{ text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' }]);
        } else {
            let clubName = "N/A";
            let countryDisplayNameForBreadcrumb = "Country";
            let countryCodeForBreadcrumb = "";

            if (sticker.clubs) {
                clubName = sticker.clubs.name;
                countryCodeForBreadcrumb = sticker.clubs.country;
                if (sticker.clubs.country) {
                    const countryDetail = countryCodeToDetails_Generic[sticker.clubs.country.toUpperCase()];
                    countryDisplayNameForBreadcrumb = countryDetail ? countryDetail.name : sticker.clubs.country;
                }
                if (mainHeading) mainHeading.style.display = 'none'; // Hide heading - info shown in right column
                document.title = `Sticker #${sticker.id} - ${clubName} - ${countryDisplayNameForBreadcrumb} - Sticker Catalogue`;
                updateCanonicalUrl(`https://stickerhunt.club/stickers/${sticker.id}.html`);
                updateMetaDescription(`Football sticker #${sticker.id} from ${clubName}, ${countryDisplayNameForBreadcrumb}. View this sticker in our collection.`);

                // Update meta keywords from club media field
                if (sticker.clubs && sticker.clubs.media) {
                    updateMetaKeywords(sticker.clubs.media);
                }

                const { count: totalClubsInCountry } = await supabaseClient
                    .from('clubs')
                    .select('*', { count: 'exact', head: true })
                    .eq('country', countryCodeForBreadcrumb);

                const { count: totalStickersInClub } = await supabaseClient
                    .from('stickers')
                    .select('*', { count: 'exact', head: true })
                    .eq('club_id', sticker.club_id);

                updateBreadcrumbs([
                    { text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' },
                    { text: `All clubs from ${countryDisplayNameForBreadcrumb} (${totalClubsInCountry || 0})`, link: `/countries/${countryCodeForBreadcrumb.toUpperCase()}.html` },
                    { text: `All stickers from ${clubName} (${totalStickersInClub || 0})`, link: `/clubs/${sticker.club_id}.html` }
                ]);

                // Get all stickers for this club to enable prev/next navigation
                const { data: clubStickers, error: clubStickersError } = await supabaseClient
                    .from('stickers')
                    .select('id')
                    .eq('club_id', sticker.club_id)
                    .order('id', { ascending: true });

                if (clubStickers && clubStickers.length > 1) {
                    const currentIndex = clubStickers.findIndex(s => s.id === sticker.id);
                    if (currentIndex > 0) {
                        prevStickerId = clubStickers[currentIndex - 1].id;
                    }
                    if (currentIndex < clubStickers.length - 1) {
                        nextStickerId = clubStickers[currentIndex + 1].id;
                    }
                }
            } else {
                if (mainHeading) mainHeading.style.display = 'none'; // Hide heading - info shown in right column
                updateBreadcrumbs([{ text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' }]);
            }

            // Navigation links for prev/next stickers (positioned below image in left column)
            let navigationHtml = '';
            if (prevStickerId !== null || nextStickerId !== null) {
                navigationHtml = '<div class="sticker-nav-buttons">';

                if (prevStickerId !== null) {
                    navigationHtml += `<a href="/stickers/${prevStickerId}.html" class="btn btn-nav sticker-nav-btn">← #${prevStickerId}</a>`;
                } else {
                    navigationHtml += '<span class="sticker-nav-placeholder"></span>';
                }

                if (nextStickerId !== null) {
                    navigationHtml += `<a href="/stickers/${nextStickerId}.html" class="btn btn-nav sticker-nav-btn">#${nextStickerId} →</a>`;
                } else {
                    navigationHtml += '<span class="sticker-nav-placeholder"></span>';
                }

                navigationHtml += '</div>';
            }

            // Use optimized detail image URL, but keep original for full-size view
            const detailImageUrl = SharedUtils.getDetailImageUrl(sticker.image_url);

            // Build right column info
            const hasLocation = sticker.location && sticker.location.trim() !== '';
            const hasDate = sticker.found != null;
            const hasCoordinates = sticker.latitude != null && sticker.longitude != null;

            // Format date if available
            let formattedDate = '';
            if (hasDate) {
                const dateObj = new Date(sticker.found);
                formattedDate = dateObj.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            }

            // Build right panel content (similar to quiz result panel)
            const clubDisplayName = sticker.clubs ? sticker.clubs.name : 'Unknown Club';

            let rightPanelHtml = `
                <div class="sticker-detail-right-panel">
                    <div class="sticker-detail-info-block">
                        <h2 class="sticker-detail-club-name">${clubDisplayName}</h2>
                        <p class="sticker-detail-id">#${sticker.id}</p>
                        ${hasDate ? `<p class="sticker-detail-date">Hunted on ${formattedDate}</p>` : ''}
                        ${hasLocation ? `<p class="sticker-detail-location">${sticker.location}</p>` : ''}
                    </div>
                </div>
            `;

            // Build map section HTML if coordinates are available (full width below two columns)
            const mapSectionHtml = hasCoordinates ? `
                <div class="sticker-map-section sticker-map-full-width">
                    <div id="sticker-map" class="sticker-map-container"></div>
                    <div class="sticker-detail-actions">
                        <a href="/map.html" class="btn btn-nav">View Full Map</a>
                        <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
                    </div>
                </div>
            ` : `
                <div class="sticker-detail-actions sticker-actions-no-map">
                    <a href="/quiz.html" class="btn btn-nav">Play Quiz</a>
                </div>
            `;

            contentBodyHtml = `
                <div class="sticker-detail-view sticker-detail-two-column">
                    <div class="sticker-detail-left-column">
                        <div class="sticker-detail-image-container" onclick="window.open('${sticker.image_url}', '_blank')">
                            <img src="${detailImageUrl}"
                                 alt="Sticker ${sticker.id} ${sticker.clubs ? `- ${sticker.clubs.name}` : ''}"
                                 class="sticker-detail-image"
                                 decoding="async">
                        </div>
                        ${navigationHtml}
                    </div>
                    ${rightPanelHtml}
                </div>
                ${mapSectionHtml}
            `;
        }
        contentDiv.innerHTML = contentBodyHtml;

        // Initialize map if coordinates are available
        if (sticker && sticker.latitude != null && sticker.longitude != null) {
            const clubName = sticker.clubs ? sticker.clubs.name : null;

            // Fetch nearby stickers for the map
            const nearbyStickers = await fetchNearbyStickers(
                sticker.latitude,
                sticker.longitude,
                sticker.id
            );

            initializeStickerMap(sticker.latitude, sticker.longitude, clubName, sticker.id, nearbyStickers);
        }
    } catch (error) {
        console.error(`An error occurred while loading sticker ID ${stickerId}:`, error);
        if (mainHeading) mainHeading.textContent = "Error Loading Sticker";
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
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
    SharedUtils.loginWithGoogle(supabaseClient, '/quiz.html').then(result => {
        if (result.error) {
            alert('Login failed. Please try again.');
        }
    });
}

// Logout
async function handleLogoutClick() {
    console.log('Logout clicked, supabaseClient:', !!supabaseClient);
    if (!supabaseClient) {
        console.error('Logout failed: supabaseClient is null');
        return;
    }

    try {
        console.log('Calling SharedUtils.logout...');
        const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
        console.log('Logout result:', result);
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

/**
 * Setup auth - CRITICAL FIX for mobile
 * Uses getSession() first, then sets up listener for future changes.
 * Ignores INITIAL_SESSION to avoid race conditions on mobile.
 */
function setupAuth() {
    console.log('setupAuth called, supabaseClient:', !!supabaseClient);
    if (!supabaseClient) return;

    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    console.log('logoutButton found:', !!logoutButton);

    // Set up button handlers
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
        console.log('Logout click handler attached');
    }

    // Step 1: Get current session FIRST (this is the source of truth)
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
            SharedUtils.identifyAmplitudeUser(user, currentUserProfile); // Identify in Amplitude
            updateAuthUI(user);
        } else {
            updateAuthUI(null);
        }

        // Step 2: Set up listener for FUTURE auth changes only
        setupAuthStateListener();
    });
}

/**
 * Auth state listener - only for FUTURE changes after initial load
 * CRITICAL: Ignores INITIAL_SESSION to prevent race conditions on mobile
 */
function setupAuthStateListener() {
    if (!supabaseClient) return;

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        // CRITICAL: Skip INITIAL_SESSION - we already handled it in setupAuth()
        // This prevents race conditions on mobile where the same session gets processed twice
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
            SharedUtils.clearAmplitudeUser(); // Clear Amplitude user
            updateAuthUI(null);
            return;
        }

        // Handle new sign in (e.g., from another tab)
        if (event === 'SIGNED_IN' && user) {
            // Only process if it's a different user or we don't have a user yet
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

// ========== MAP FUNCTIONS ==========

/**
 * Fetch nearby stickers within a bounding box
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} excludeStickerId - Current sticker ID to exclude
 * @returns {Promise<Array>} - Array of nearby stickers
 */
async function fetchNearbyStickers(latitude, longitude, excludeStickerId) {
    if (!supabaseClient) return [];

    // Define bounding box (~5km radius approximately)
    const latDelta = 0.045; // ~5km
    const lngDelta = 0.06;  // ~5km (varies by latitude)

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

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
            .neq('id', excludeStickerId)
            .gte('latitude', minLat)
            .lte('latitude', maxLat)
            .gte('longitude', minLng)
            .lte('longitude', maxLng)
            .limit(50);

        if (error) {
            console.error('Error fetching nearby stickers:', error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error('Error in fetchNearbyStickers:', e);
        return [];
    }
}

/**
 * Initialize Leaflet map for sticker location
 * @param {number} latitude - Sticker latitude
 * @param {number} longitude - Sticker longitude
 * @param {string|null} clubName - Club name for popup
 * @param {number} currentStickerId - Current sticker ID
 * @param {Array} nearbyStickers - Array of nearby stickers to show
 */
function initializeStickerMap(latitude, longitude, clubName, currentStickerId, nearbyStickers) {
    const mapContainer = document.getElementById('sticker-map');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        mapContainer.innerHTML = '<p style="text-align: center; color: var(--color-info-text);">Map could not be loaded</p>';
        return;
    }

    // Initialize the map
    const map = L.map('sticker-map', {
        scrollWheelZoom: false // Disable scroll zoom for better UX
    }).setView([latitude, longitude], 15);

    // Add CartoDB Voyager tiles (English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Create custom icons
    const activeIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

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

    // Add nearby stickers as inactive markers (add these first so they're behind)
    if (nearbyStickers && nearbyStickers.length > 0) {
        nearbyStickers.forEach(sticker => {
            if (sticker.latitude && sticker.longitude) {
                const nearbyClubName = sticker.clubs ? sticker.clubs.name : 'Unknown Club';
                const popupContent = `
                    <div class="nearby-sticker-popup">
                        <strong>${nearbyClubName}</strong>
                        <a href="/stickers/${sticker.id}.html" class="map-popup-link">View</a>
                    </div>
                `;

                const nearbyMarker = L.marker([sticker.latitude, sticker.longitude], {
                    icon: inactiveIcon,
                    zIndexOffset: -100
                }).addTo(map);

                nearbyMarker.bindPopup(popupContent);

                // Show popup on hover (desktop) and click (mobile)
                nearbyMarker.on('mouseover', function() {
                    this.openPopup();
                });
                nearbyMarker.on('click', function() {
                    this.openPopup();
                });
            }
        });
    }

    // Add main marker for current sticker (on top)
    const mainMarker = L.marker([latitude, longitude], {
        icon: activeIcon,
        zIndexOffset: 100
    }).addTo(map);

    // Add popup with club name
    if (clubName) {
        mainMarker.bindPopup(`<strong>${clubName}</strong>`).openPopup();
    }

    // Enable scroll zoom only when map is focused (clicked)
    map.on('click', function() {
        map.scrollWheelZoom.enable();
    });

    // Disable scroll zoom when mouse leaves map
    mapContainer.addEventListener('mouseleave', function() {
        map.scrollWheelZoom.disable();
    });
}

/**
 * Initialize Leaflet map for club sticker locations
 * @param {Array} stickers - Array of stickers with latitude and longitude
 * @param {string} clubName - Club name for popups
 */
function initializeClubMap(stickers, clubName) {
    const mapContainer = document.getElementById('club-map');
    if (!mapContainer) {
        console.error('Club map container not found');
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        mapContainer.innerHTML = '<p style="text-align: center; color: var(--color-info-text);">Map could not be loaded</p>';
        return;
    }

    // Calculate bounds to fit all markers
    const bounds = L.latLngBounds();
    stickers.forEach(sticker => {
        if (sticker.latitude && sticker.longitude) {
            bounds.extend([sticker.latitude, sticker.longitude]);
        }
    });

    // Initialize the map
    const map = L.map('club-map', {
        scrollWheelZoom: false
    });

    // Fit map to bounds with padding
    map.fitBounds(bounds, { padding: [30, 30] });

    // Add CartoDB Voyager tiles (English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Create marker icon
    const markerIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Add markers for each sticker
    stickers.forEach(sticker => {
        if (sticker.latitude && sticker.longitude) {
            const popupContent = `
                <div class="club-sticker-popup">
                    <strong>${clubName}</strong>
                    <a href="/stickers/${sticker.id}.html" class="map-popup-link">View sticker</a>
                </div>
            `;

            const marker = L.marker([sticker.latitude, sticker.longitude], {
                icon: markerIcon
            }).addTo(map);

            marker.bindPopup(popupContent);

            marker.on('mouseover', function() {
                this.openPopup();
            });
            marker.on('click', function() {
                this.openPopup();
            });
        }
    });

    // Enable scroll zoom only when map is focused (clicked)
    map.on('click', function() {
        map.scrollWheelZoom.enable();
    });

    // Disable scroll zoom when mouse leaves map
    mapContainer.addEventListener('mouseleave', function() {
        map.scrollWheelZoom.disable();
    });
}

/**
 * Initialize catalogue map preview (static mini-map)
 */
function initializeCatalogueMapPreview() {
    const mapContainer = document.getElementById('catalogue-map-container');
    if (!mapContainer) {
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        mapContainer.innerHTML = '<p style="text-align: center; color: var(--color-info-text); padding: 40px 0;">Map preview unavailable</p>';
        return;
    }

    // Initialize static map preview centered on Europe
    const map = L.map('catalogue-map-container', {
        scrollWheelZoom: false,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
    }).setView([50.0, 10.0], 3);

    // Add CartoDB Voyager tiles (English labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Load a sample of stickers with coordinates for preview dots
    fetchSampleGeoStickers().then(stickers => {
        if (stickers && stickers.length > 0) {
            // Add simple circle markers for stickers
            stickers.forEach(sticker => {
                if (sticker.latitude && sticker.longitude) {
                    L.circleMarker([sticker.latitude, sticker.longitude], {
                        radius: 4,
                        fillColor: '#007bff',
                        color: '#007bff',
                        weight: 1,
                        opacity: 0.7,
                        fillOpacity: 0.5
                    }).addTo(map);
                }
            });
        }
    });

    // Make the whole map clickable to go to full map
    mapContainer.style.cursor = 'pointer';
    mapContainer.addEventListener('click', function() {
        window.location.href = '/map.html';
    });
}

/**
 * Fetch sample of stickers with coordinates for map preview
 */
async function fetchSampleGeoStickers() {
    if (!supabaseClient) return [];

    try {
        const { data, error } = await supabaseClient
            .from('stickers')
            .select('latitude, longitude')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(200);

        if (error) {
            console.error('Error fetching geo stickers for preview:', error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error('Error in fetchSampleGeoStickers:', e);
        return [];
    }
}
