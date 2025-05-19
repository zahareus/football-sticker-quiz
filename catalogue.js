// catalogue.js

const SUPABASE_URL = 'https://rbmeslzlbsolkxnvesqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw';

let supabaseClient;

try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.error("Error initializing Supabase client:", error);
    const contentDiv = document.getElementById('catalogue-content');
    if (contentDiv) {
        contentDiv.innerHTML = "<p>Initialization error. Catalogue cannot be loaded.</p>";
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
    "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "SCO": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿"
};

document.addEventListener('DOMContentLoaded', () => {
    if (supabaseClient) {
        console.log('Supabase client initialized for catalogue.');
        routeContent();
    } else {
        console.error('Supabase client failed to initialize. Catalogue functionality will be limited.');
        const contentDiv = document.getElementById('catalogue-content');
        if (contentDiv) {
            contentDiv.innerHTML = "<p>Initialization error. Catalogue cannot be loaded.</p>";
        }
    }
});

function routeContent() {
    const params = new URLSearchParams(window.location.search);
    const countryCode = params.get('country');
    const clubId = params.get('club_id');
    const stickerId = params.get('sticker_id');

    const mainHeading = document.querySelector('#catalogue-container > h1');
    if (!mainHeading) {
        console.error("Main heading H1 for catalogue not found!");
        return;
    }
    const contentDiv = document.getElementById('catalogue-content');

    if (stickerId) {
        mainHeading.textContent = "Sticker Details";
        // loadStickerDetails(stickerId); // To be implemented
        console.log(`Loading sticker: ${stickerId}`);
        contentDiv.innerHTML = `<p>Details for Sticker ID: ${stickerId} coming soon!</p><p><a href="catalogue.html">Back to Catalogue Home</a></p>`;
    } else if (clubId) {
        mainHeading.textContent = "Club Gallery";
        // loadClubDetails(clubId); // To be implemented
        console.log(`Loading club: ${clubId}`);
        contentDiv.innerHTML = `<p>Gallery for Club ID: ${clubId} coming soon!</p><p><a href="catalogue.html">Back to Catalogue Home</a></p>`;
    } else if (countryCode) {
        const countryInfo = countryCodeToDetails_Generic[countryCode.toUpperCase()];
        mainHeading.textContent = countryInfo ? `${countryInfo.name} Clubs` : "Clubs from Country";
        loadCountryDetails(countryCode.toUpperCase()); // Ensure countryCode is uppercase
    } else {
        mainHeading.textContent = "Sticker Catalogue";
        loadContinentsAndCountries();
    }
}

async function loadContinentsAndCountries() {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = '<h2>Countries by Continent</h2><p>Loading data...</p>';

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

        let htmlOutput = '';
        const sortedContinentNames = Object.keys(continents).sort((a,b) => a.localeCompare(b));
        sortedContinentNames.forEach(continentName => {
            htmlOutput += `<div class="continent-section">`;
            htmlOutput += `<h3>${continentName}</h3>`;
            htmlOutput += `<ul class="country-list">`;
            const countriesInContinent = continents[continentName].sort((a, b) => a.name.localeCompare(b.name));
            countriesInContinent.forEach(country => {
                const flagEmoji = countryCodeToFlagEmoji[country.code.toUpperCase()] || '🏳️';
                htmlOutput += `<li><a href="catalogue.html?country=${country.code}"><span class="flag-emoji">${flagEmoji}</span> ${country.name} (${country.clubCount} clubs)</a></li>`;
            });
            htmlOutput += `</ul></div>`;
        });

        if (htmlOutput === '') {
            contentDiv.innerHTML = '<p>No data to display. Check the maps and database entries.</p>';
        } else {
            const currentHeading = contentDiv.querySelector('h2');
            contentDiv.innerHTML = (currentHeading ? currentHeading.outerHTML : '<h2>Countries by Continent</h2>') + htmlOutput;
        }
    } catch (error) {
        console.error('An error occurred while loading countries:', error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

// NEW FUNCTION to load clubs for a specific country
async function loadCountryDetails(countryCode) {
    const contentDiv = document.getElementById('catalogue-content');
    const countryInfo = countryCodeToDetails_Generic[countryCode]; // countryCode is already uppercase
    const countryDisplayName = countryInfo ? countryInfo.name : countryCode;
    const flagEmoji = countryCodeToFlagEmoji[countryCode] || '🏳️';

    contentDiv.innerHTML = `<h2><span class="flag-emoji">${flagEmoji}</span> ${countryDisplayName} - Clubs</h2><p>Loading clubs...</p>`;

    if (!supabaseClient) {
        contentDiv.innerHTML = '<p>Error: Supabase client not initialized. Cannot load data.</p>';
        return;
    }

    try {
        // 1. Fetch clubs for the given countryCode
        const { data: clubsInCountry, error: clubsError } = await supabaseClient
            .from('clubs')
            .select('id, name, country') // Select name and id
            .eq('country', countryCode); // Filter by country code

        if (clubsError) {
            console.error(`Error fetching clubs for ${countryCode}:`, clubsError);
            contentDiv.innerHTML = `<p>Could not load clubs for ${countryDisplayName}: ${clubsError.message}</p>`;
            return;
        }

        if (!clubsInCountry || clubsInCountry.length === 0) {
            contentDiv.innerHTML += `<p>No clubs found for ${countryDisplayName} in the catalogue.</p>`;
            // Add a back button to the main catalogue page
            contentDiv.innerHTML += `<p><a href="catalogue.html" class="btn btn-secondary btn-small">Back to All Countries</a></p>`;
            return;
        }

        // 2. For each club, fetch its sticker count
        // This can be N+1 queries, for a large number of clubs, consider a more optimized approach later if needed
        // (e.g., a database function or fetching all stickers and grouping client-side, but that might be too much data)
        const clubsWithStickerCounts = [];
        for (const club of clubsInCountry) {
            const { count, error: countError } = await supabaseClient
                .from('stickers_dev') // Assuming your stickers table is 'stickers_dev'
                .select('id', { count: 'exact', head: true })
                .eq('club_id', club.id);

            if (countError) {
                console.warn(`Could not fetch sticker count for club ${club.name} (ID: ${club.id}):`, countError.message);
                clubsWithStickerCounts.push({ ...club, stickerCount: 0, errorLoadingCount: true });
            } else {
                clubsWithStickerCounts.push({ ...club, stickerCount: count });
            }
        }

        // 3. Sort clubs alphabetically by name
        clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));

        // 4. Display the list of clubs
        let htmlOutput = '<ul class="club-list">'; // New class for styling club list
        clubsWithStickerCounts.forEach(club => {
            let countText = `(${club.stickerCount} sticker${club.stickerCount !== 1 ? 's' : ''})`;
            if (club.errorLoadingCount) {
                countText = "(sticker count unavailable)";
            }
            htmlOutput += `<li><a href="catalogue.html?club_id=${club.id}">${club.name} ${countText}</a></li>`;
        });
        htmlOutput += '</ul>';

        // Keep the H2 heading and replace the "Loading clubs..." paragraph
        const currentH2 = contentDiv.querySelector('h2');
        contentDiv.innerHTML = (currentH2 ? currentH2.outerHTML : `<h2>${countryDisplayName} - Clubs</h2>`) + htmlOutput;
        contentDiv.innerHTML += `<p style="margin-top: 20px;"><a href="catalogue.html" class="btn btn-secondary btn-small">Back to All Countries</a></p>`;


    } catch (error) {
        console.error(`An error occurred while loading clubs for ${countryCode}:`, error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
        contentDiv.innerHTML += `<p><a href="catalogue.html" class="btn btn-secondary btn-small">Back to All Countries</a></p>`;
    }
}
