// Vercel Serverless Function for dynamic sitemap generation

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

module.exports = async function handler(req, res) {
    try {
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        };

        // Fetch all clubs
        const clubsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/clubs?select=id,country`,
            { headers }
        );

        if (!clubsResponse.ok) {
            console.error('Error fetching clubs');
            return res.status(500).end('Error generating sitemap');
        }

        const clubs = await clubsResponse.json();

        // Fetch all stickers (only IDs for sitemap)
        const stickersResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/stickers?select=id`,
            { headers }
        );

        if (!stickersResponse.ok) {
            console.error('Error fetching stickers');
            return res.status(500).end('Error generating sitemap');
        }

        const stickers = await stickersResponse.json();

        // Get unique countries
        const countries = [...new Set(clubs.map(c => c.country).filter(Boolean))];

        // Build sitemap XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

        // Static pages
        xml += `<url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`;
        xml += `<url><loc>${BASE_URL}/quiz.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
        xml += `<url><loc>${BASE_URL}/catalogue.html</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`;
        xml += `<url><loc>${BASE_URL}/leaderboard.html</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>`;
        xml += `<url><loc>${BASE_URL}/map.html</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
        xml += `<url><loc>${BASE_URL}/stickerstat.html</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`;
        xml += `<url><loc>${BASE_URL}/about.html</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>`;

        // Country pages (static)
        for (const country of countries) {
            xml += `<url><loc>${BASE_URL}/countries/${country.toUpperCase()}.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
        }

        // Club pages (static)
        for (const club of clubs) {
            xml += `<url><loc>${BASE_URL}/clubs/${club.id}.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
        }

        // Sticker pages (static)
        for (const sticker of stickers) {
            xml += `<url><loc>${BASE_URL}/stickers/${sticker.id}.html</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
        }

        xml += '</urlset>';

        // Set headers and send
        res.setHeader('Content-Type', 'text/xml');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');

        return res.status(200).end(xml);
    } catch (error) {
        console.error('Sitemap error:', error);
        return res.status(500).end('Error generating sitemap');
    }
};
