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
        loadStickerDetails(stickerId);
    } else if (clubId) {
        mainHeading.textContent = "Club Sticker Gallery";
        loadClubDetails(clubId);
    } else if (countryCode) {
        const countryInfo = countryCodeToDetails_Generic[countryCode.toUpperCase()];
        const flagEmoji = countryCodeToFlagEmoji[countryCode.toUpperCase()] || '';
        mainHeading.textContent = countryInfo ? `${flagEmoji} ${countryInfo.name} - Clubs` : `${flagEmoji} Clubs from ${countryCode}`;
        loadCountryDetails(countryCode.toUpperCase());
    } else {
        mainHeading.textContent = "Sticker Catalogue";
        loadContinentsAndCountries();
    }
}

async function loadContinentsAndCountries() {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = '<p>Loading data...</p>';
    updateBreadcrumbs([]);

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }
    try {
        const { data: clubs, error: clubsError } = await supabaseClient
            .from('clubs')
            .select('id, country');

        if (clubsError) {
            console.error('Error fetching clubs:', clubsError);
            contentDiv.innerHTML = `<p>Could not load club data: ${clubsError.message}</p>`;
            return;
        }
        if (!clubs || clubs.length === 0) {
            contentDiv.innerHTML = '<p>No clubs found in the catalogue.</p>';
            return;
        }

        // Fetch total sticker count
        const { count: stickerCount, error: stickerCountError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        const totalStickers = stickerCountError ? 0 : (stickerCount || 0);

        const clubsByCountryCode = {};
        clubs.forEach(club => {
            if (club.country) {
                const countryCodeNormalized = club.country.toUpperCase();
                if (!clubsByCountryCode[countryCodeNormalized]) {
                    clubsByCountryCode[countryCodeNormalized] = 0;
                }
                clubsByCountryCode[countryCodeNormalized]++;
            }
        });

        const continents = {};
        for (const countryCode in clubsByCountryCode) {
            const detail = countryCodeToDetails_Generic[countryCode];
            let continentName, countryName;
            if (detail) {
                continentName = detail.continent;
                countryName = detail.name;
            } else {
                continentName = "Other Countries / Unclassified";
                countryName = countryCode;
                console.warn(`Details for country code ${countryCode} not found in countryCodeToDetails_Generic map.`);
            }
            if (!continents[continentName]) {
                continents[continentName] = [];
            }
            continents[continentName].push({
                code: countryCode,
                name: countryName,
                clubCount: clubsByCountryCode[countryCode]
            });
        }

        // Add statistics block
        let statsHtml = `
            <div class="catalogue-stats">
                <p><strong>Countries:</strong> ${totalCountriesInCatalogue}</p>
                <p><strong>Clubs:</strong> ${clubs.length}</p>
                <p><strong>Stickers:</strong> ${totalStickers}</p>
            </div>
        `;

        let listHtml = '';
        const sortedContinentNames = Object.keys(continents).sort((a, b) => a.localeCompare(b));
        sortedContinentNames.forEach(continentName => {
            listHtml += `<div class="continent-section">`;
            listHtml += `<h3>${continentName}</h3>`;
            listHtml += `<ul class="country-list">`;
            const countriesInContinent = continents[continentName].sort((a, b) => a.name.localeCompare(b.name));
            countriesInContinent.forEach(country => {
                const flagEmoji = countryCodeToFlagEmoji[country.code.toUpperCase()] || '🏳️';
                const clubWord = country.clubCount === 1 ? 'club' : 'clubs';
                listHtml += `<li><a href="catalogue.html?country=${country.code}"><span class="flag-emoji">${flagEmoji}</span> ${country.name} (${country.clubCount} ${clubWord})</a></li>`;
            });
            listHtml += `</ul></div>`;
        });

        if (listHtml === '') {
            contentDiv.innerHTML = '<p>No data to display. Check the maps and database entries.</p>';
        } else {
            contentDiv.innerHTML = statsHtml + listHtml;
        }
    } catch (error) {
        console.error('An error occurred while loading countries:', error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
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
            document.title = `${countryDisplayName} Clubs - Sticker Catalogue`;

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
                clubListHtml += `<li><a href="catalogue.html?club_id=${club.id}">${club.name} ${countText}</a></li>`;
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
        } else {
            const countryInfo = countryCodeToDetails_Generic[clubData.country.toUpperCase()];
            const countryDisplayName = countryInfo ? countryInfo.name : clubData.country;

            if (mainHeading) mainHeading.textContent = `${clubData.name} - Sticker Gallery`;
            document.title = `${clubData.name} Sticker Gallery - Sticker Catalogue`;

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
                { text: `All clubs from ${countryDisplayName} (${totalClubsInCountry || 0})`, link: `catalogue.html?country=${clubData.country}` }
            ]);

            const { data: stickersResponse, error: stickersError } = await supabaseClient
                .from('stickers')
                .select('id, image_url')
                .eq('club_id', clubId)
                .order('id', { ascending: true });

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
                        <a href="catalogue.html?sticker_id=${sticker.id}" class="sticker-preview-link">
                            <img src="${thumbnailUrl}"
                                 alt="Sticker ID ${sticker.id} for ${clubData.name}"
                                 class="sticker-preview-image"
                                 loading="lazy"
                                 decoding="async">
                        </a>`;
                });
                galleryHtml += '</div>';
                contentBodyHtml = clubInfoHtml + galleryHtml;
            }
        }
        contentDiv.innerHTML = contentBodyHtml;
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
                if (mainHeading) mainHeading.textContent = `Sticker #${sticker.id} - ${clubName}`;
                document.title = `Sticker #${sticker.id} ${clubName} - Sticker Catalogue`;

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
                    { text: `All clubs from ${countryDisplayNameForBreadcrumb} (${totalClubsInCountry || 0})`, link: `catalogue.html?country=${countryCodeForBreadcrumb}` },
                    { text: `All stickers from ${clubName} (${totalStickersInClub || 0})`, link: `catalogue.html?club_id=${sticker.club_id}` }
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
                if (mainHeading) mainHeading.textContent = `Sticker #${sticker.id}`;
                updateBreadcrumbs([{ text: `All Countries (${totalCountriesInCatalogue})`, link: 'catalogue.html' }]);
            }

            // Navigation links for prev/next stickers (positioned below image)
            let navigationHtml = '';
            if (prevStickerId !== null || nextStickerId !== null) {
                navigationHtml = '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; margin-bottom: 24px; gap: 16px;">';

                if (prevStickerId !== null) {
                    navigationHtml += `<a href="catalogue.html?sticker_id=${prevStickerId}" style="color: var(--color-info-text); text-decoration: none; font-size: 1.1em; font-weight: 500;">← #${prevStickerId}</a>`;
                } else {
                    navigationHtml += '<span style="visibility: hidden;">← #0</span>';
                }

                if (nextStickerId !== null) {
                    navigationHtml += `<a href="catalogue.html?sticker_id=${nextStickerId}" style="color: var(--color-info-text); text-decoration: none; font-size: 1.1em; font-weight: 500;">#${nextStickerId} →</a>`;
                } else {
                    navigationHtml += '<span style="visibility: hidden;">#0 →</span>';
                }

                navigationHtml += '</div>';
            }

            // Use optimized detail image URL, but keep original for full-size view
            const detailImageUrl = SharedUtils.getDetailImageUrl(sticker.image_url);
            contentBodyHtml = `
                <div class="sticker-detail-view">
                    <div class="sticker-detail-image-container" onclick="window.open('${sticker.image_url}', '_blank')">
                        <img src="${detailImageUrl}"
                             alt="Sticker ${sticker.id} ${sticker.clubs ? `- ${sticker.clubs.name}` : ''}"
                             class="sticker-detail-image"
                             decoding="async">
                    </div>
                    ${navigationHtml}
                    <div class="sticker-detail-info">
                        <p><strong>🌍 Location Found:</strong> ${sticker.location || 'N/A'}</p>
                        <p><strong>📅 Date Found:</strong> ${sticker.found ? new Date(sticker.found).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            `;
        }
        contentDiv.innerHTML = contentBodyHtml;
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
    if (!supabaseClient) return;

    const result = await SharedUtils.logout(supabaseClient, currentUser?.id);
    if (result.error) {
        alert('Logout failed. Please try again.');
    } else {
        window.location.reload();
    }
}

/**
 * Setup auth - CRITICAL FIX for mobile
 * Uses getSession() first, then sets up listener for future changes.
 * Ignores INITIAL_SESSION to avoid race conditions on mobile.
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
