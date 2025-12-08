// map.js - Global map page functionality

let supabaseClient;

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

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
                        <a href="catalogue.html?sticker_id=${sticker.id}" class="map-popup-link">View</a>
                    </div>
                `;

                const marker = L.marker([sticker.latitude, sticker.longitude], {
                    icon: inactiveIcon
                }).addTo(map);

                marker.bindPopup(popupContent);

                // Show popup on hover
                marker.on('mouseover', function() {
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
