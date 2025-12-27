// Vercel Serverless Function for dynamic sitemap generation
// This function fetches all countries, clubs, and stickers from Supabase
// and generates a sitemap.xml for search engine indexing

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

export default async function handler(req, res) {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Fetch all unique countries from clubs
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('id, country, updated_at');

        if (clubsError) {
            console.error('Error fetching clubs:', clubsError);
            return res.status(500).send('Error generating sitemap');
        }

        // Fetch all stickers
        const { data: stickers, error: stickersError } = await supabase
            .from('stickers')
            .select('id, updated_at');

        if (stickersError) {
            console.error('Error fetching stickers:', stickersError);
            return res.status(500).send('Error generating sitemap');
        }

        // Get unique countries
        const countries = [...new Set(clubs.map(c => c.country))];

        // Build sitemap XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- Static pages -->
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
            const lastmod = club.updated_at ? new Date(club.updated_at).toISOString().split('T')[0] : '';
            xml += `    <url>
        <loc>${BASE_URL}/catalogue.html?club_id=${club.id}</loc>
        ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        }

        // Add sticker pages
        for (const sticker of stickers) {
            const lastmod = sticker.updated_at ? new Date(sticker.updated_at).toISOString().split('T')[0] : '';
            xml += `    <url>
        <loc>${BASE_URL}/catalogue.html?sticker_id=${sticker.id}</loc>
        ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
`;
        }

        xml += `</urlset>`;

        // Set response headers
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour

        return res.status(200).send(xml);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        return res.status(500).send('Error generating sitemap');
    }
}
