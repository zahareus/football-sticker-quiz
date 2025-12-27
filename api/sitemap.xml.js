// Vercel Serverless Function for dynamic sitemap generation
// Uses native fetch to query Supabase REST API directly

const SUPABASE_URL = "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

module.exports = async function handler(req, res) {
    try {
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        // Fetch all clubs
        const clubsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/clubs?select=id,country`,
            { headers }
        );
        const clubs = await clubsResponse.json();

        if (!clubsResponse.ok) {
            console.error('Error fetching clubs:', clubs);
            return res.status(500).send('Error generating sitemap');
        }

        // Fetch all stickers (only IDs for sitemap)
        const stickersResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/stickers?select=id`,
            { headers }
        );
        const stickers = await stickersResponse.json();

        if (!stickersResponse.ok) {
            console.error('Error fetching stickers:', stickers);
            return res.status(500).send('Error generating sitemap');
        }

        // Get unique countries
        const countries = [...new Set(clubs.map(c => c.country).filter(Boolean))];

        // Build sitemap XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${BASE_URL}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${BASE_URL}/quiz.html</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${BASE_URL}/catalogue.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${BASE_URL}/leaderboard.html</loc>
        <changefreq>hourly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>${BASE_URL}/map.html</loc>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>
    <url>
        <loc>${BASE_URL}/stickerstat.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.6</priority>
    </url>
    <url>
        <loc>${BASE_URL}/about.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>
`;

        // Add country pages
        for (const country of countries) {
            xml += `    <url>
        <loc>${BASE_URL}/catalogue.html?country=${encodeURIComponent(country)}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;
        }

        // Add club pages
        for (const club of clubs) {
            xml += `    <url>
        <loc>${BASE_URL}/catalogue.html?club_id=${club.id}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        }

        // Add sticker pages
        for (const sticker of stickers) {
            xml += `    <url>
        <loc>${BASE_URL}/catalogue.html?sticker_id=${sticker.id}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
`;
        }

        xml += `</urlset>`;

        // Set response headers
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return res.status(200).send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        return res.status(500).send('Error generating sitemap: ' + error.message);
    }
};
