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

    try {
        const { clubName, countryCode, field } = req.body;

        if (!clubName || !countryCode || !field) {
            return res.status(400).json({
                error: 'Missing required fields: clubName, countryCode, field'
            });
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
