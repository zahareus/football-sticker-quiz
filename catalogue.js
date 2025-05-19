// catalogue.js

const SUPABASE_URL = 'https://rbmeslzlbsolkxnvesqb.supabase.co'; // ЗАМІНИ НА СВІЙ URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw'; // ЗАМІНИ НА СВІЙ КЛЮЧ

let supabase;
try {
    supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error("Error initializing Supabase client:", error);
    const contentDiv = document.getElementById('catalogue-content');
    if (contentDiv) {
        contentDiv.innerHTML = "<p>Error loading data. Please try refreshing the page.</p>";
    }
}

// Generic mapping of country codes to full names and continents.
// The script will only use entries relevant to the countries found in your 'clubs' table.
// You can extend this list if new countries appear in your data that are not covered.
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
    "CYP": { name: "Cyprus", continent: "Europe" }, // Or Europe geographically
    "CZE": { name: "Czech Republic", continent: "Europe" },
    "DNK": { name: "Denmark", continent: "Europe" },
    "DJI": { name: "Djibouti", continent: "Africa" },
    "DOM": { name: "Dominican Republic", continent: "North America" },
    "ECU": { name: "Ecuador", continent: "South America" },
    "EGY": { name: "Egypt", continent: "Africa" }, // Also Asia
    "SLV": { name: "El Salvador", continent: "North America" },
    "GNQ": { name: "Equatorial Guinea", continent: "Africa" },
    "EST": { name: "Estonia", continent: "Europe" },
    "ETH": { name: "Ethiopia", continent: "Africa" },
    "FJI": { name: "Fiji", continent: "Oceania" },
    "FIN": { name: "Finland", continent: "Europe" },
    "FRA": { name: "France", continent: "Europe" },
    "GAB": { name: "Gabon", continent: "Africa" },
    "GMB": { name: "Gambia", continent: "Africa" },
    "GEO": { name: "Georgia", continent: "Europe" }, // Or Europe
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
    "KAZ": { name: "Kazakhstan", continent: "Europe" }, // Also Europe
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
    "RUS": { name: "Russia", continent: "Europe" }, // Also Asia
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
    "TUR": { name: "Turkey", continent: "Europe" }, // Also Europe
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
    "WAL": { name: "Wales", continent: "Europe" },
    // Add more countries as needed, using their 3-letter ISO codes.
    // FIFA codes might sometimes differ (e.g., ENG, SCO, WAL for GBR components).
    // For simplicity, we'll stick to ISO 3166-1 alpha-3 codes where possible,
    // but ensure they match what's in your 'clubs' table 'country' column.
};


document.addEventListener('DOMContentLoaded', () => {
    if (supabase) {
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

    // Update main heading based on view
    const mainHeading = document.querySelector('#catalogue-container > h1');
    if (!mainHeading) { // Should not happen if HTML is correct
        console.error("Main heading H1 for catalogue not found!");
        return;
    }

    if (stickerId) {
        mainHeading.textContent = "Sticker Details"; // Placeholder
        // loadStickerDetails(stickerId); // We'll create this function later
        console.log(`Loading sticker: ${stickerId}`);
        document.getElementById('catalogue-content').innerHTML = `<p>Details for Sticker ID: ${stickerId} coming soon!</p><p><a href="catalogue.html">Back to Catalogue Home</a></p>`;
    } else if (clubId) {
        mainHeading.textContent = "Club Gallery"; // Placeholder
        // loadClubDetails(clubId); // We'll create this function later
        console.log(`Loading club: ${clubId}`);
        document.getElementById('catalogue-content').innerHTML = `<p>Gallery for Club ID: ${clubId} coming soon!</p><p><a href="catalogue.html">Back to Catalogue Home</a></p>`; //
    } else if (countryCode) {
        const countryInfo = countryCodeToDetails_Generic[countryCode.toUpperCase()];
        mainHeading.textContent = countryInfo ? `${countryInfo.name} Clubs` : "Clubs from Country";
        // loadCountryDetails(countryCode); // We'll create this function later
        console.log(`Loading country: ${countryCode}`);
        document.getElementById('catalogue-content').innerHTML = `<p>List of clubs for ${countryInfo ? countryInfo.name : countryCode} coming soon!</p><p><a href="catalogue.html">Back to Catalogue Home</a></p>`;
    } else {
        mainHeading.textContent = "Sticker Catalogue";
        loadContinentsAndCountries();
    }
}

async function loadContinentsAndCountries() {
    const contentDiv = document.getElementById('catalogue-content');
    contentDiv.innerHTML = '<h2>Countries by Continent</h2><p>Loading data...</p>';

    try {
        // 1. Fetch all clubs to determine represented countries and club counts
        // Select only 'id' and 'country' to minimize data transfer
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs') // Ensure your table is named 'clubs'
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

        // 2. Group clubs by country and count them
        const clubsByCountryCode = {};
        clubs.forEach(club => {
            if (club.country) { // Check if country is specified
                const countryCodeNormalized = club.country.toUpperCase(); // Normalize to uppercase
                if (!clubsByCountryCode[countryCodeNormalized]) {
                    clubsByCountryCode[countryCodeNormalized] = 0;
                }
                clubsByCountryCode[countryCodeNormalized]++;
            }
        });

        // 3. Group countries by continents using the generic map
        const continents = {};
        for (const countryCode in clubsByCountryCode) {
            const detail = countryCodeToDetails_Generic[countryCode]; // Lookup in our generic map
            let continentName, countryName;

            if (detail) {
                continentName = detail.continent;
                countryName = detail.name;
            } else {
                continentName = "Other Countries / Unclassified"; // Group for unknown codes
                countryName = countryCode; // Show the code if full name is unknown
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

        // 4. Sort continents and countries within continents alphabetically
        let htmlOutput = '';
        const sortedContinentNames = Object.keys(continents).sort((a,b) => a.localeCompare(b));

        sortedContinentNames.forEach(continentName => {
            htmlOutput += `<div class="continent-section">`;
            htmlOutput += `<h3>${continentName}</h3>`;
            htmlOutput += `<ul class="country-list">`;

            const countriesInContinent = continents[continentName].sort((a, b) => a.name.localeCompare(b.name));

            countriesInContinent.forEach(country => {
                // Create links to navigate to the country page view
                htmlOutput += `<li><a href="catalogue.html?country=${country.code}">${country.name} (${country.clubCount} clubs)</a></li>`;
            });

            htmlOutput += `</ul>`;
            htmlOutput += `</div>`;
        });

        if (htmlOutput === '') {
            contentDiv.innerHTML = '<p>No data to display. Check the `countryCodeToDetails_Generic` map and database entries.</p>';
        } else {
            // Replace "Loading data..." with the generated HTML
            const currentHeading = contentDiv.querySelector('h2'); // Keep the "Countries by Continent" h2
            contentDiv.innerHTML = (currentHeading ? currentHeading.outerHTML : '<h2>Countries by Continent</h2>') + htmlOutput;
        }

    } catch (error) {
        console.error('An error occurred while loading countries:', error);
        contentDiv.innerHTML = `<p>An unexpected error occurred: ${error.message}</p>`;
    }
}

// Placeholder functions for later steps -
// We will implement these in subsequent steps.

// async function loadCountryDetails(countryCode) {
//     const contentDiv = document.getElementById('catalogue-content');
//     const countryInfo = countryCodeToDetails_Generic[countryCode.toUpperCase()];
//     const countryDisplayName = countryInfo ? countryInfo.name : countryCode;
//     contentDiv.innerHTML = `<h2>Clubs in ${countryDisplayName}</h2><p>Loading clubs...</p>`;
//     // ... (logic to fetch and display clubs for this country)
// }

// async function loadClubDetails(clubId) {
//     const contentDiv = document.getElementById('catalogue-content');
//     contentDiv.innerHTML = `<h2>Club Sticker Gallery (ID: ${clubId})</h2><p>Loading stickers...</p>`;
//     // ... (logic to fetch and display stickers for this club)
// }

// async function loadStickerDetails(stickerId) {
//     const contentDiv = document.getElementById('catalogue-content');
//     contentDiv.innerHTML = `<h2>Sticker Details (ID: ${stickerId})</h2><p>Loading sticker info...</p>`;
//     // ... (logic to fetch and display full details for this sticker)
// }
