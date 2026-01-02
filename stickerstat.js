// stickerstat.js - Statistics page functionality
// Uses SharedUtils from shared.js for common functionality

let supabaseClient;

// Auth state
let currentUser = null;
let currentUserProfile = null;

// Edit nickname form elements
let editNicknameForm;
let nicknameInputElement;
let cancelEditNicknameButton;

// Chart instance
let stickersChart = null;

// Country code to details mapping (same as catalogue.js)
const countryCodeToDetails = {
    "AFG": { name: "Afghanistan" }, "ALB": { name: "Albania" }, "DZA": { name: "Algeria" },
    "AND": { name: "Andorra" }, "AGO": { name: "Angola" }, "ARG": { name: "Argentina" },
    "ARM": { name: "Armenia" }, "AUS": { name: "Australia" }, "AUT": { name: "Austria" },
    "AZE": { name: "Azerbaijan" }, "BHS": { name: "Bahamas" }, "BHR": { name: "Bahrain" },
    "BGD": { name: "Bangladesh" }, "BLR": { name: "Belarus" }, "BEL": { name: "Belgium" },
    "BLZ": { name: "Belize" }, "BEN": { name: "Benin" }, "BOL": { name: "Bolivia" },
    "BIH": { name: "Bosnia and Herzegovina" }, "BWA": { name: "Botswana" }, "BRA": { name: "Brazil" },
    "BGR": { name: "Bulgaria" }, "BFA": { name: "Burkina Faso" }, "KHM": { name: "Cambodia" },
    "CMR": { name: "Cameroon" }, "CAN": { name: "Canada" }, "CPV": { name: "Cape Verde" },
    "CAF": { name: "Central African Republic" }, "TCD": { name: "Chad" }, "CHL": { name: "Chile" },
    "CHN": { name: "China" }, "COL": { name: "Colombia" }, "COG": { name: "Congo" },
    "CRI": { name: "Costa Rica" }, "HRV": { name: "Croatia" }, "CUB": { name: "Cuba" },
    "CYP": { name: "Cyprus" }, "CZE": { name: "Czech Republic" }, "DNK": { name: "Denmark" },
    "DJI": { name: "Djibouti" }, "DOM": { name: "Dominican Republic" }, "ECU": { name: "Ecuador" },
    "EGY": { name: "Egypt" }, "SLV": { name: "El Salvador" }, "GNQ": { name: "Equatorial Guinea" },
    "EST": { name: "Estonia" }, "ETH": { name: "Ethiopia" }, "FJI": { name: "Fiji" },
    "FIN": { name: "Finland" }, "FRA": { name: "France" }, "GAB": { name: "Gabon" },
    "GMB": { name: "Gambia" }, "GEO": { name: "Georgia" }, "DEU": { name: "Germany" },
    "GHA": { name: "Ghana" }, "GRC": { name: "Greece" }, "GTM": { name: "Guatemala" },
    "GIN": { name: "Guinea" }, "HTI": { name: "Haiti" }, "HND": { name: "Honduras" },
    "HUN": { name: "Hungary" }, "ISL": { name: "Iceland" }, "IND": { name: "India" },
    "IDN": { name: "Indonesia" }, "IRN": { name: "Iran" }, "IRQ": { name: "Iraq" },
    "IRL": { name: "Ireland" }, "ISR": { name: "Israel" }, "ITA": { name: "Italy" },
    "CIV": { name: "Ivory Coast" }, "JAM": { name: "Jamaica" }, "JPN": { name: "Japan" },
    "JOR": { name: "Jordan" }, "KAZ": { name: "Kazakhstan" }, "KEN": { name: "Kenya" },
    "KWT": { name: "Kuwait" }, "KGZ": { name: "Kyrgyzstan" }, "LVA": { name: "Latvia" },
    "LBN": { name: "Lebanon" }, "LBR": { name: "Liberia" }, "LBY": { name: "Libya" },
    "LIE": { name: "Liechtenstein" }, "LTU": { name: "Lithuania" }, "LUX": { name: "Luxembourg" },
    "MKD": { name: "North Macedonia" }, "MDG": { name: "Madagascar" }, "MWI": { name: "Malawi" },
    "MYS": { name: "Malaysia" }, "MLI": { name: "Mali" }, "MLT": { name: "Malta" },
    "MRT": { name: "Mauritania" }, "MEX": { name: "Mexico" }, "MDA": { name: "Moldova" },
    "MCO": { name: "Monaco" }, "MNG": { name: "Mongolia" }, "MNE": { name: "Montenegro" },
    "MAR": { name: "Morocco" }, "MOZ": { name: "Mozambique" }, "NPL": { name: "Nepal" },
    "NLD": { name: "Netherlands" }, "NZL": { name: "New Zealand" }, "NIC": { name: "Nicaragua" },
    "NER": { name: "Niger" }, "NGA": { name: "Nigeria" }, "PRK": { name: "North Korea" },
    "NOR": { name: "Norway" }, "OMN": { name: "Oman" }, "PAK": { name: "Pakistan" },
    "PAN": { name: "Panama" }, "PNG": { name: "Papua New Guinea" }, "PRY": { name: "Paraguay" },
    "PER": { name: "Peru" }, "PHL": { name: "Philippines" }, "POL": { name: "Poland" },
    "PRT": { name: "Portugal" }, "QAT": { name: "Qatar" }, "ROU": { name: "Romania" },
    "RUS": { name: "Russia" }, "RWA": { name: "Rwanda" }, "SAU": { name: "Saudi Arabia" },
    "SEN": { name: "Senegal" }, "SRB": { name: "Serbia" }, "SLE": { name: "Sierra Leone" },
    "SGP": { name: "Singapore" }, "SVK": { name: "Slovakia" }, "SVN": { name: "Slovenia" },
    "SOM": { name: "Somalia" }, "ZAF": { name: "South Africa" }, "KOR": { name: "South Korea" },
    "ESP": { name: "Spain" }, "LKA": { name: "Sri Lanka" }, "SDN": { name: "Sudan" },
    "SWE": { name: "Sweden" }, "CHE": { name: "Switzerland" }, "SYR": { name: "Syria" },
    "TWN": { name: "Taiwan" }, "TZA": { name: "Tanzania" }, "THA": { name: "Thailand" },
    "TGO": { name: "Togo" }, "TUN": { name: "Tunisia" }, "TUR": { name: "Turkey" },
    "UGA": { name: "Uganda" }, "UKR": { name: "Ukraine" }, "ARE": { name: "United Arab Emirates" },
    "GBR": { name: "United Kingdom" }, "USA": { name: "United States" }, "URY": { name: "Uruguay" },
    "UZB": { name: "Uzbekistan" }, "VEN": { name: "Venezuela" }, "VNM": { name: "Vietnam" },
    "YEM": { name: "Yemen" }, "ZMB": { name: "Zambia" }, "ZWE": { name: "Zimbabwe" },
    "ENG": { name: "England" }, "SCO": { name: "Scotland" }, "WLS": { name: "Wales" },
    "NIR": { name: "Northern Ireland" }
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

// Initialize Supabase Client
if (typeof SharedUtils === 'undefined') {
    console.error('Error: SharedUtils not loaded. Make sure shared.js is included before stickerstat.js');
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

        // Load statistics
        await loadAllStatistics();
    } else {
        console.error('Supabase client failed to initialize.');
    }
});

async function loadAllStatistics() {
    // Load all data in parallel
    const [stickersData, clubsData, countriesData] = await Promise.all([
        loadStickersGrowth(),
        loadTopClubs(),
        loadTopCountries()
    ]);
}

// ========== STICKERS GROWTH CHART ==========

async function loadStickersGrowth() {
    const chartCanvas = document.getElementById('stickers-chart');
    const totalStickersEl = document.getElementById('total-stickers-count');

    if (!supabaseClient || !chartCanvas) return;

    try {
        // First, get the exact total count of ALL stickers
        const { count: totalCount, error: countError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const totalStickers = totalCount || 0;
        if (totalStickersEl) {
            totalStickersEl.textContent = totalStickers;
        }

        // Get count of stickers WITHOUT dates
        const { count: nullDateCount, error: nullCountError } = await supabaseClient
            .from('stickers')
            .select('*', { count: 'exact', head: true })
            .is('found', null);

        if (nullCountError) throw nullCountError;

        const stickersWithoutDateCount = nullDateCount || 0;

        // Fetch all stickers WITH dates using pagination
        let stickersWithDate = [];
        let offset = 0;
        const batchSize = 1000;

        while (true) {
            const { data: batch, error: batchError } = await supabaseClient
                .from('stickers')
                .select('id, found')
                .not('found', 'is', null)
                .order('found', { ascending: true })
                .range(offset, offset + batchSize - 1);

            if (batchError) throw batchError;

            if (!batch || batch.length === 0) break;

            stickersWithDate = stickersWithDate.concat(batch);
            offset += batchSize;

            if (batch.length < batchSize) break;
        }

        // Sort by date to ensure correct order after pagination
        stickersWithDate.sort((a, b) => new Date(a.found) - new Date(b.found));

        // Find the earliest date
        let firstDate = null;
        if (stickersWithDate && stickersWithDate.length > 0) {
            firstDate = stickersWithDate[0].found.split('T')[0];
        } else {
            // If no stickers have dates, use today
            firstDate = new Date().toISOString().split('T')[0];
        }

        // Group stickers by date and calculate cumulative count
        const dateCountMap = new Map();

        // Start with stickers without date at the first date
        let cumulative = stickersWithoutDateCount;
        dateCountMap.set(firstDate, cumulative);

        // Add stickers with dates cumulatively
        if (stickersWithDate) {
            stickersWithDate.forEach(sticker => {
                const dateStr = sticker.found.split('T')[0];
                cumulative++;
                dateCountMap.set(dateStr, cumulative);
            });
        }

        // Convert to arrays for Chart.js
        const labels = Array.from(dateCountMap.keys());
        const data = Array.from(dateCountMap.values());

        // Create chart
        if (stickersChart) {
            stickersChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        stickersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Stickers',
                    data: data,
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                const date = new Date(context[0].label);
                                return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 6,
                            callback: function(value, index) {
                                const label = this.getLabelForValue(value);
                                const date = new Date(label);
                                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            }
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

    } catch (error) {
        console.error('Error loading stickers growth:', error);
        chartCanvas.parentElement.innerHTML = '<p>Could not load chart data.</p>';
    }
}

// ========== TOP CLUBS ==========

async function loadTopClubs() {
    const container = document.getElementById('clubs-table-container');
    const totalClubsEl = document.getElementById('total-clubs-count');

    if (!supabaseClient || !container) return;

    try {
        // Get exact total count of clubs
        const { count: clubCount, error: clubCountError } = await supabaseClient
            .from('clubs')
            .select('*', { count: 'exact', head: true });

        if (clubCountError) throw clubCountError;

        if (totalClubsEl) {
            totalClubsEl.textContent = clubCount || 0;
        }

        // Fetch all clubs
        const { data: clubs, error: clubsError } = await supabaseClient
            .from('clubs')
            .select('id, name')
            .range(0, 9999);

        if (clubsError) throw clubsError;

        // Get all stickers and count by club_id
        // Use multiple ranges if needed to get all stickers
        let allStickers = [];
        let offset = 0;
        const batchSize = 1000;

        while (true) {
            const { data: batch, error: batchError } = await supabaseClient
                .from('stickers')
                .select('club_id')
                .range(offset, offset + batchSize - 1);

            if (batchError) throw batchError;

            if (!batch || batch.length === 0) break;

            allStickers = allStickers.concat(batch);
            offset += batchSize;

            // Safety check - if we got less than batchSize, we're done
            if (batch.length < batchSize) break;
        }

        // Count stickers per club
        const stickerCountByClub = {};
        allStickers.forEach(sticker => {
            if (sticker.club_id) {
                stickerCountByClub[sticker.club_id] = (stickerCountByClub[sticker.club_id] || 0) + 1;
            }
        });

        // Create club data with sticker counts
        const clubsWithCounts = clubs.map(club => ({
            id: club.id,
            name: club.name,
            stickerCount: stickerCountByClub[club.id] || 0
        }));

        // Sort by sticker count and take top 20
        const topClubs = clubsWithCounts
            .sort((a, b) => b.stickerCount - a.stickerCount)
            .slice(0, 20);

        // Generate table HTML
        let tableHtml = '<table class="stats-table">';
        topClubs.forEach((club, index) => {
            tableHtml += `
                <tr>
                    <td class="stats-rank">${index + 1}</td>
                    <td class="stats-name"><a href="/clubs/${club.id}.html">${club.name}</a></td>
                    <td class="stats-count">${club.stickerCount}</td>
                </tr>
            `;
        });
        tableHtml += '</table>';

        container.innerHTML = tableHtml;

    } catch (error) {
        console.error('Error loading top clubs:', error);
        container.innerHTML = '<p>Could not load club data.</p>';
    }
}

// ========== TOP COUNTRIES ==========

async function loadTopCountries() {
    const container = document.getElementById('countries-table-container');
    const totalCountriesEl = document.getElementById('total-countries-count');

    if (!supabaseClient || !container) return;

    try {
        // Fetch all clubs with their countries (use range to get more than 1000)
        const { data: clubs, error } = await supabaseClient
            .from('clubs')
            .select('country')
            .range(0, 9999);

        if (error) throw error;

        // Count clubs per country
        const clubCountByCountry = {};
        clubs.forEach(club => {
            if (club.country) {
                const countryCode = club.country.toUpperCase();
                clubCountByCountry[countryCode] = (clubCountByCountry[countryCode] || 0) + 1;
            }
        });

        // Get unique countries count
        const uniqueCountries = Object.keys(clubCountByCountry).length;
        if (totalCountriesEl) {
            totalCountriesEl.textContent = uniqueCountries;
        }

        // Create country data with club counts
        const countriesWithCounts = Object.entries(clubCountByCountry).map(([code, count]) => ({
            code: code,
            name: countryCodeToDetails[code]?.name || code,
            flag: countryCodeToFlagEmoji[code] || '🏳️',
            clubCount: count
        }));

        // Sort by club count and take top 20
        const topCountries = countriesWithCounts
            .sort((a, b) => b.clubCount - a.clubCount)
            .slice(0, 20);

        // Generate table HTML
        let tableHtml = '<table class="stats-table">';
        topCountries.forEach((country, index) => {
            tableHtml += `
                <tr>
                    <td class="stats-rank">${index + 1}</td>
                    <td class="stats-name"><span class="flag-emoji">${country.flag}</span> <a href="/countries/${country.code.toUpperCase()}.html">${country.name}</a></td>
                    <td class="stats-count">${country.clubCount}</td>
                </tr>
            `;
        });
        tableHtml += '</table>';

        container.innerHTML = tableHtml;

    } catch (error) {
        console.error('Error loading top countries:', error);
        container.innerHTML = '<p>Could not load country data.</p>';
    }
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
    SharedUtils.loginWithGoogle(supabaseClient, '/stickerstat.html').then(result => {
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
