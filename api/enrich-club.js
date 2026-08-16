// Vercel Serverless Function for club data enrichment via OpenAI
// The OPENAI_API_KEY is stored securely in Vercel Environment Variables

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://stickerhunt.club');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check API key is configured
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // The page that calls this checks the session and can_upload in the browser,
    // which stops nothing: the endpoint itself was reachable with a bare curl and
    // spent OPENAI_API_KEY for whoever asked. Verify the caller server-side.
    const auth = await verifyUploader(req.headers.authorization);
    if (!auth.ok) {
        return res.status(auth.status).json({ error: auth.error });
    }

    try {
        const { clubName, countryCode, field } = req.body;

        if (!clubName || !countryCode || !field) {
            return res.status(400).json({
                error: 'Missing required fields: clubName, countryCode, field'
            });
        }

        // These strings are pasted into an LLM prompt, so bound them: a club name
        // is short and single-line, and anything longer is either a mistake or an
        // attempt to append instructions of its own.
        if (typeof clubName !== 'string' || clubName.length > 120 || /[\r\n]/.test(clubName)) {
            return res.status(400).json({ error: 'Invalid clubName' });
        }
        if (typeof countryCode !== 'string' || !/^[A-Za-z]{2,3}$/.test(countryCode)) {
            return res.status(400).json({ error: 'Invalid countryCode' });
        }

        // Validate field parameter
        const validFields = ['city', 'media', 'web', 'all'];
        if (!validFields.includes(field)) {
            return res.status(400).json({
                error: `Invalid field. Must be one of: ${validFields.join(', ')}`
            });
        }

        const result = {};

        // Enrich city
        if (field === 'city' || field === 'all') {
            const cityPrompt = `What is the city and country of the football club '${clubName}' from country code '${countryCode}'? Provide the answer in English, in the format 'City, FullCountryName'. Only provide the location, nothing else.`;
            const cityResult = await callOpenAI(OPENAI_API_KEY, cityPrompt);
            if (cityResult) {
                result.city = cityResult.replace(/['"]/g, '').trim();
            }
        }

        // Enrich media (hashtags)
        if (field === 'media' || field === 'all') {
            const mediaPrompt = `Provide 5 relevant hashtags in English for the football club '${clubName}'. These hashtags should be commonly used by the club, its fans, or in relation to the club, its stadium, or competitions it participates in. List them separated by single spaces, without commas, for example: #hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5. Only provide the hashtags, nothing else.`;
            const mediaResult = await callOpenAI(OPENAI_API_KEY, mediaPrompt);
            if (mediaResult) {
                result.media = mediaResult.replace(/['"]/g, '').trim();
            }
        }

        // Enrich web (Wikipedia or website)
        if (field === 'web' || field === 'all') {
            const webPrompt = `Find a web URL for the football club '${clubName}' from country code '${countryCode}'. Prioritize in the following order: 1. The club's official English Wikipedia page. 2. If not found, the club's Wikipedia page in its local language. 3. If not found, the club's official website. 4. If none found, any relevant informational page (Transfermarkt, Soccerway). Provide only the URL as a string, nothing else.`;
            const webResult = await callOpenAI(OPENAI_API_KEY, webPrompt);
            if (webResult) {
                let cleanUrl = webResult.replace(/['"<>]/g, '').trim();
                if (cleanUrl && !cleanUrl.startsWith('http')) {
                    cleanUrl = 'https://' + cleanUrl;
                }
                result.web = cleanUrl;
            }
        }

        return res.status(200).json({
            success: true,
            clubName,
            countryCode,
            data: result
        });

    } catch (error) {
        console.error('Enrichment error:', error);
        return res.status(500).json({
            error: 'Enrichment failed',
            message: error.message
        });
    }
};

// Supabase project URL and publishable key are public by design — the same pair
// is served to every browser in shared.js — so they are constants here rather
// than secrets. Env vars win when set, so the project can be pointed elsewhere.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rbmeslzlbsolkxnvesqb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_sGDiQzwEi3G1F3n0z_d67A_SlWdO1f-';

/**
 * Resolve an Authorization header to a user who is allowed to enrich clubs.
 * The token is checked by Supabase itself, and can_upload is read with that same
 * token, so RLS decides what the caller may see — this function never holds a
 * service-role key.
 */
async function verifyUploader(authorization) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return { ok: false, status: 401, error: 'Authentication required' };
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return { ok: false, status: 401, error: 'Authentication required' };

    try {
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
        });
        if (!userRes.ok) return { ok: false, status: 401, error: 'Invalid session' };
        const user = await userRes.json();
        if (!user?.id) return { ok: false, status: 401, error: 'Invalid session' };

        const profileRes = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=can_upload`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
        );
        if (!profileRes.ok) return { ok: false, status: 403, error: 'Not allowed' };
        const rows = await profileRes.json();
        if (!Array.isArray(rows) || rows[0]?.can_upload !== true) {
            return { ok: false, status: 403, error: 'Not allowed' };
        }
        return { ok: true, userId: user.id };
    } catch (err) {
        console.error('Auth check failed:', err);
        return { ok: false, status: 503, error: 'Auth check unavailable' };
    }
}

async function callOpenAI(apiKey, prompt, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.5,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('OpenAI API Error:', errorData);
                if (i === retries - 1) {
                    throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            if (content) return content;

            if (i === retries - 1) {
                throw new Error('OpenAI returned empty content');
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`OpenAI call attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return null;
}
