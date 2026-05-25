/**
 * Shared SEO helpers for all StickerHunt page generators
 * Centralizes: country data, image utils, alt text, multilingual meta,
 * top-rated sticker selection, featured gallery, breadcrumbs, templates
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env from scripts directory
const __seoHelpersDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__seoHelpersDir, '.env') });

// ─── Supabase Client Factory ────────────────────────────────────────────────

export function createSupabaseClient() {
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rbmeslzlbsolkxnvesqb.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_ANON_KEY) {
        console.error('SUPABASE_ANON_KEY not set. Create scripts/.env or set environment variable.');
        process.exit(1);
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ─── Country Names ───────────────────────────────────────────────────────────

export const COUNTRY_NAMES = {
    'AFG': 'Afghanistan', 'ALB': 'Albania', 'DZA': 'Algeria', 'AND': 'Andorra',
    'AGO': 'Angola', 'ARG': 'Argentina', 'ARM': 'Armenia', 'AUS': 'Australia',
    'AUT': 'Austria', 'AZE': 'Azerbaijan', 'BHS': 'Bahamas', 'BHR': 'Bahrain',
    'BGD': 'Bangladesh', 'BLR': 'Belarus', 'BEL': 'Belgium', 'BLZ': 'Belize',
    'BEN': 'Benin', 'BOL': 'Bolivia', 'BIH': 'Bosnia and Herzegovina',
    'BWA': 'Botswana', 'BRA': 'Brazil', 'BGR': 'Bulgaria', 'BFA': 'Burkina Faso',
    'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada', 'CPV': 'Cape Verde',
    'CAF': 'Central African Republic', 'TCD': 'Chad', 'CHL': 'Chile', 'CHN': 'China',
    'COL': 'Colombia', 'COG': 'Congo', 'CRI': 'Costa Rica', 'HRV': 'Croatia',
    'CUB': 'Cuba', 'CYP': 'Cyprus', 'CZE': 'Czech Republic', 'DNK': 'Denmark',
    'DJI': 'Djibouti', 'DOM': 'Dominican Republic', 'ECU': 'Ecuador', 'EGY': 'Egypt',
    'SLV': 'El Salvador', 'GNQ': 'Equatorial Guinea', 'EST': 'Estonia', 'ETH': 'Ethiopia',
    'FJI': 'Fiji', 'FIN': 'Finland', 'FRA': 'France', 'GAB': 'Gabon', 'GMB': 'Gambia',
    'GEO': 'Georgia', 'DEU': 'Germany', 'GHA': 'Ghana', 'GRC': 'Greece',
    'GTM': 'Guatemala', 'GIN': 'Guinea', 'HTI': 'Haiti', 'HND': 'Honduras',
    'HUN': 'Hungary', 'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia',
    'IRN': 'Iran', 'IRQ': 'Iraq', 'IRL': 'Ireland', 'ISR': 'Israel', 'ITA': 'Italy',
    'CIV': 'Ivory Coast', 'JAM': 'Jamaica', 'JPN': 'Japan', 'JOR': 'Jordan',
    'KAZ': 'Kazakhstan', 'KEN': 'Kenya', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan',
    'LVA': 'Latvia', 'LBN': 'Lebanon', 'LBR': 'Liberia', 'LBY': 'Libya',
    'LIE': 'Liechtenstein', 'LTU': 'Lithuania', 'LUX': 'Luxembourg',
    'MKD': 'North Macedonia', 'MDG': 'Madagascar', 'MWI': 'Malawi', 'MYS': 'Malaysia',
    'MLI': 'Mali', 'MLT': 'Malta', 'MRT': 'Mauritania', 'MEX': 'Mexico',
    'MDA': 'Moldova', 'MCO': 'Monaco', 'MNG': 'Mongolia', 'MNE': 'Montenegro',
    'MAR': 'Morocco', 'MOZ': 'Mozambique', 'NPL': 'Nepal', 'NLD': 'Netherlands',
    'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NER': 'Niger', 'NGA': 'Nigeria',
    'PRK': 'North Korea', 'NOR': 'Norway', 'OMN': 'Oman', 'PAK': 'Pakistan',
    'PAN': 'Panama', 'PNG': 'Papua New Guinea', 'PRY': 'Paraguay', 'PER': 'Peru',
    'PHL': 'Philippines', 'POL': 'Poland', 'PRT': 'Portugal', 'QAT': 'Qatar',
    'ROU': 'Romania', 'RUS': 'Russia', 'RWA': 'Rwanda', 'SAU': 'Saudi Arabia',
    'SEN': 'Senegal', 'SRB': 'Serbia', 'SLE': 'Sierra Leone', 'SGP': 'Singapore',
    'SVK': 'Slovakia', 'SVN': 'Slovenia', 'SOM': 'Somalia', 'ZAF': 'South Africa',
    'KOR': 'South Korea', 'ESP': 'Spain', 'LKA': 'Sri Lanka', 'SDN': 'Sudan',
    'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria', 'TWN': 'Taiwan',
    'TZA': 'Tanzania', 'THA': 'Thailand', 'TGO': 'Togo', 'TUN': 'Tunisia',
    'TUR': 'Turkey', 'UGA': 'Uganda', 'UKR': 'Ukraine', 'ARE': 'United Arab Emirates',
    'GBR': 'United Kingdom', 'USA': 'United States', 'URY': 'Uruguay',
    'UZB': 'Uzbekistan', 'VEN': 'Venezuela', 'VNM': 'Vietnam', 'YEM': 'Yemen',
    'ZMB': 'Zambia', 'ZWE': 'Zimbabwe',
    'ENG': 'England', 'SCO': 'Scotland', 'WLS': 'Wales', 'NIR': 'Northern Ireland'
};

export function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

// ─── Country Flags (ISO 3166-1 alpha-3 → emoji) ──────────────────────────────

export const COUNTRY_FLAGS = {
    'AFG':'🇦🇫','ALB':'🇦🇱','DZA':'🇩🇿','AND':'🇦🇩','AGO':'🇦🇴','ARG':'🇦🇷',
    'ARM':'🇦🇲','AUS':'🇦🇺','AUT':'🇦🇹','AZE':'🇦🇿','BHS':'🇧🇸','BHR':'🇧🇭',
    'BGD':'🇧🇩','BLR':'🇧🇾','BEL':'🇧🇪','BLZ':'🇧🇿','BEN':'🇧🇯','BOL':'🇧🇴',
    'BIH':'🇧🇦','BWA':'🇧🇼','BRA':'🇧🇷','BGR':'🇧🇬','BFA':'🇧🇫','KHM':'🇰🇭',
    'CMR':'🇨🇲','CAN':'🇨🇦','CPV':'🇨🇻','CAF':'🇨🇫','TCD':'🇹🇩','CHL':'🇨🇱',
    'CHN':'🇨🇳','COL':'🇨🇴','COG':'🇨🇬','CRI':'🇨🇷','HRV':'🇭🇷','CUB':'🇨🇺',
    'CYP':'🇨🇾','CZE':'🇨🇿','DNK':'🇩🇰','DJI':'🇩🇯','DOM':'🇩🇴','ECU':'🇪🇨',
    'EGY':'🇪🇬','SLV':'🇸🇻','GNQ':'🇬🇶','EST':'🇪🇪','ETH':'🇪🇹','FJI':'🇫🇯',
    'FIN':'🇫🇮','FRA':'🇫🇷','GAB':'🇬🇦','GMB':'🇬🇲','GEO':'🇬🇪','DEU':'🇩🇪',
    'GHA':'🇬🇭','GRC':'🇬🇷','GTM':'🇬🇹','GIN':'🇬🇳','HTI':'🇭🇹','HND':'🇭🇳',
    'HUN':'🇭🇺','ISL':'🇮🇸','IND':'🇮🇳','IDN':'🇮🇩','IRN':'🇮🇷','IRQ':'🇮🇶',
    'IRL':'🇮🇪','ISR':'🇮🇱','ITA':'🇮🇹','CIV':'🇨🇮','JAM':'🇯🇲','JPN':'🇯🇵',
    'JOR':'🇯🇴','KAZ':'🇰🇿','KEN':'🇰🇪','KWT':'🇰🇼','KGZ':'🇰🇬','LVA':'🇱🇻',
    'LBN':'🇱🇧','LBR':'🇱🇷','LBY':'🇱🇾','LIE':'🇱🇮','LTU':'🇱🇹','LUX':'🇱🇺',
    'MKD':'🇲🇰','MDG':'🇲🇬','MWI':'🇲🇼','MYS':'🇲🇾','MLI':'🇲🇱','MLT':'🇲🇹',
    'MRT':'🇲🇷','MEX':'🇲🇽','MDA':'🇲🇩','MCO':'🇲🇨','MNG':'🇲🇳','MNE':'🇲🇪',
    'MAR':'🇲🇦','MOZ':'🇲🇿','NPL':'🇳🇵','NLD':'🇳🇱','NZL':'🇳🇿','NIC':'🇳🇮',
    'NER':'🇳🇪','NGA':'🇳🇬','PRK':'🇰🇵','NOR':'🇳🇴','OMN':'🇴🇲','PAK':'🇵🇰',
    'PAN':'🇵🇦','PNG':'🇵🇬','PRY':'🇵🇾','PER':'🇵🇪','PHL':'🇵🇭','POL':'🇵🇱',
    'PRT':'🇵🇹','QAT':'🇶🇦','ROU':'🇷🇴','RUS':'🇷🇺','RWA':'🇷🇼','SAU':'🇸🇦',
    'SEN':'🇸🇳','SRB':'🇷🇸','SLE':'🇸🇱','SGP':'🇸🇬','SVK':'🇸🇰','SVN':'🇸🇮',
    'SOM':'🇸🇴','ZAF':'🇿🇦','KOR':'🇰🇷','ESP':'🇪🇸','LKA':'🇱🇰','SDN':'🇸🇩',
    'SWE':'🇸🇪','CHE':'🇨🇭','SYR':'🇸🇾','TWN':'🇹🇼','TZA':'🇹🇿','THA':'🇹🇭',
    'TGO':'🇹🇬','TUN':'🇹🇳','TUR':'🇹🇷','UGA':'🇺🇬','UKR':'🇺🇦','ARE':'🇦🇪',
    'GBR':'🇬🇧','USA':'🇺🇸','URY':'🇺🇾','UZB':'🇺🇿','VEN':'🇻🇪','VNM':'🇻🇳',
    'YEM':'🇾🇪','ZMB':'🇿🇲','ZWE':'🇿🇼',
    'ENG':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','SCO':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','WLS':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','NIR':'🇬🇧'
};

export function getCountryFlag(code) {
    return COUNTRY_FLAGS[code?.toUpperCase()] || '';
}

// Reverse: country name -> code
const COUNTRY_CODES = {};
for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
    COUNTRY_CODES[name.toLowerCase()] = code;
}
export function getCountryCode(name) {
    return COUNTRY_CODES[name?.toLowerCase()] || null;
}

// ─── Country -> Language Mapping ─────────────────────────────────────────────

export const COUNTRY_LANGUAGES = {
    'NOR': 'no', 'SWE': 'sv', 'DNK': 'da', 'FIN': 'fi',
    'DEU': 'de', 'AUT': 'de', 'CHE': 'de', 'LIE': 'de',
    'NLD': 'nl', 'BEL': 'nl',
    'FRA': 'fr', 'MCO': 'fr',
    'ESP': 'es', 'ARG': 'es', 'CHL': 'es', 'COL': 'es', 'MEX': 'es',
    'PER': 'es', 'URY': 'es', 'VEN': 'es', 'ECU': 'es', 'BOL': 'es',
    'PRY': 'es', 'CRI': 'es', 'PAN': 'es', 'GTM': 'es', 'HND': 'es',
    'SLV': 'es', 'NIC': 'es', 'DOM': 'es', 'CUB': 'es',
    'PRT': 'pt', 'BRA': 'pt',
    'ITA': 'it',
    'TUR': 'tr',
    'POL': 'pl',
    'ROU': 'ro',
    'HRV': 'hr',
    'SRB': 'sr',
    'SVN': 'sl',
    'CZE': 'cs',
    'SVK': 'sk',
    'HUN': 'hu',
    'GRC': 'el',
    'BGR': 'bg',
    'UKR': 'uk',
    'RUS': 'ru',
    'BLR': 'be',
    'GEO': 'ka',
    'ISR': 'he',
    'JPN': 'ja',
    'KOR': 'ko',
    'IDN': 'id',
    'ISL': 'is',
    'IRL': 'ga',
    'GBR': 'en', 'ENG': 'en', 'SCO': 'en', 'WLS': 'en', 'NIR': 'en',
    'USA': 'en', 'CAN': 'en', 'AUS': 'en', 'NZL': 'en',
};

// Key site languages for multilingual meta (besides English which is default)
export const SITE_LANGUAGES = ['de', 'nl', 'no', 'sv', 'es', 'pt', 'fr'];

// ─── Image Utilities ─────────────────────────────────────────────────────────

export function getOptimizedImageUrl(imageUrl, suffix = '_web') {
    if (!imageUrl) return imageUrl;
    if (!imageUrl.includes('/storage/v1/object/')) return imageUrl;
    try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        const lastDotIndex = pathname.lastIndexOf('.');
        if (lastDotIndex === -1) {
            url.pathname = pathname + suffix + '.webp';
        } else {
            url.pathname = pathname.substring(0, lastDotIndex) + suffix + '.webp';
        }
        return url.toString();
    } catch {
        return imageUrl;
    }
}

export function getDetailImageUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_web');
}

export function getThumbnailUrl(imageUrl) {
    return getOptimizedImageUrl(imageUrl, '_thumb');
}

export function cleanTrailingQuery(url) {
    return url ? url.replace(/\?$/, '') : url;
}

const SUPABASE_STICKERS_PREFIX = 'https://rbmeslzlbsolkxnvesqb.supabase.co/storage/v1/object/public/stickers/';

export function toLocalImg(url) {
    if (!url) return url;
    const cleaned = cleanTrailingQuery(url);
    if (cleaned.startsWith(SUPABASE_STICKERS_PREFIX)) {
        return '/img/' + cleaned.slice(SUPABASE_STICKERS_PREFIX.length);
    }
    return cleaned;
}

// ─── Text Utilities ──────────────────────────────────────────────────────────

/**
 * Convert a city/place name into a clean URL slug.
 * NFD-normalize → strip combining marks (Düsseldorf → dusseldorf, Köln → koln, Mrčevac → mrcevac);
 * map Turkish/Polish specials that NFD doesn't decompose; lowercase; non-[a-z0-9] → '-'.
 * SOURCE OF TRUTH — all generators MUST import this. Inline copies caused production drift
 * (Beyoğlu → 'beyo-lu' zombies, 29.04.2026).
 */
export function cityToSlug(cityName) {
    if (!cityName) return '';
    const SPECIAL_MAP = {
        'ı': 'i', 'İ': 'i', 'ł': 'l', 'Ł': 'l',
        'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'œ': 'oe', 'Œ': 'oe',
        'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd', 'þ': 'th', 'Þ': 'th'
    };
    let s = cityName.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.split('').map(ch => SPECIAL_MAP[ch] !== undefined ? SPECIAL_MAP[ch] : ch).join('');
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function stripEmoji(str) {
    return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
}

export function escapeHtml(str) {
    if (!str || typeof str !== 'string') return str ?? '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function parseMediaKeywords(mediaString) {
    if (!mediaString) return [];
    const hashtags = mediaString.match(/#\w+/g);
    if (!hashtags) return [];
    return hashtags.map(h => h.replace('#', ''));
}

export function buildClubKeywords(clubNameClean, countryName, mediaString) {
    let keywords = `${clubNameClean} stickers, ${clubNameClean} football stickers, identify ${clubNameClean} sticker, ${countryName} football stickers, football sticker database`;
    if (mediaString) {
        const mediaKeywords = parseMediaKeywords(mediaString);
        if (mediaKeywords.length > 0) {
            keywords += ', ' + mediaKeywords.join(', ');
        }
    }
    return keywords;
}

// ─── Template Utilities ──────────────────────────────────────────────────────

let _criticalCssCache = null;
function loadCriticalCss(projectRoot) {
    if (_criticalCssCache !== null) return _criticalCssCache;
    const p = join(projectRoot, 'templates', '_critical', 'critical.css');
    if (!existsSync(p)) {
        throw new Error(`critical.css not found at ${p}. Run: node scripts/build-critical-css.js`);
    }
    _criticalCssCache = readFileSync(p, 'utf-8');
    return _criticalCssCache;
}

export function loadTemplate(templateName, projectRoot) {
    const templatePath = join(projectRoot, 'templates', templateName);
    if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    let html = readFileSync(templatePath, 'utf-8');
    // Auto-inject critical CSS so every generator gets it without per-call wiring.
    if (html.includes('{{CRITICAL_CSS}}')) {
        html = html.replaceAll('{{CRITICAL_CSS}}', loadCriticalCss(projectRoot));
    }
    return html;
}

export function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        result = result.replaceAll(placeholder, value ?? '');
    }
    return result;
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

export function generateBreadcrumbs(links) {
    return links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' → ');
}

export function generateBreadcrumbSchema(links) {
    const items = [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://stickerhunt.club" }
    ];
    links.forEach((link, i) => {
        items.push({
            "@type": "ListItem",
            "position": i + 2,
            "name": link.text,
            "item": `https://stickerhunt.club${link.url}`
        });
    });
    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items
    };
    return `<script type="application/ld+json">\n    ${JSON.stringify(schema, null, 2)}\n    </script>`;
}

// ─── Top-Rated Sticker Selection ─────────────────────────────────────────────

/**
 * Select top-rated stickers by ELO rating.
 * Sort: rating DESC -> games DESC (tiebreaker) -> id DESC (newer first)
 */
export function selectTopRatedStickers(stickers, count = 3) {
    if (!stickers || stickers.length === 0) return [];
    return [...stickers]
        .sort((a, b) =>
            (b.rating || 1500) - (a.rating || 1500)
            || (b.games || 0) - (a.games || 0)
            || b.id - a.id
        )
        .slice(0, count);
}

// ─── Descriptive Alt Text ────────────────────────────────────────────────────

/**
 * Generate context-rich alt text for sticker images.
 * @param {Object} params
 * @param {string} params.clubName - Club name (clean, no emoji)
 * @param {number} params.stickerId - Sticker ID
 * @param {string} [params.context] - 'sticker' | 'club' | 'city' | 'country'
 * @param {string} [params.countryName] - Country name
 * @param {string} [params.cityName] - City name
 * @param {string} [params.league] - League name from wiki cache
 */
export function generateDescriptiveAltText({ clubName, stickerId, context = 'sticker', countryName, cityName, league }) {
    const club = stripEmoji(clubName || '');
    switch (context) {
        case 'sticker': {
            const parts = [`${club} football sticker`];
            if (cityName && countryName) parts.push(`from ${cityName}, ${countryName}`);
            else if (countryName) parts.push(`from ${countryName}`);
            if (league) parts.push(`${league} club`);
            parts.push(`#${stickerId}`);
            return parts.join(' -- ');
        }
        case 'club':
            return `${club} street sticker #${stickerId} -- ${countryName || ''} football`.trim();
        case 'city':
            return `${club} sticker #${stickerId} found in ${cityName || 'city'}${countryName ? ', ' + countryName : ''}`;
        case 'country':
            return `${club} sticker -- top rated from ${countryName || ''}`.trim();
        default:
            return `${club} football sticker #${stickerId}`;
    }
}

// ─── Featured Stickers Gallery ───────────────────────────────────────────────

/**
 * Generate HTML for a featured stickers gallery strip (top-rated).
 * @param {Array} topStickers - Already sorted by rating
 * @param {Object} clubsMap - { clubId: { name, country } }
 * @param {string} [heading] - Section heading
 */
export function generateFeaturedGallery(topStickers, clubsMap = {}, heading = 'Top Rated Stickers') {
    if (!topStickers || topStickers.length === 0) return '';

    let html = `<div class="more-from-club">\n<h3>${heading}</h3>\n<div class="sticker-strip">`;
    topStickers.forEach(sticker => {
        const club = clubsMap[sticker.club_id];
        const clubName = club ? stripEmoji(club.name) : '';
        const countryName = club ? getCountryName(club.country) : '';
        const thumbUrl = getThumbnailUrl(sticker.image_url);
        const altText = generateDescriptiveAltText({
            clubName: clubName,
            stickerId: sticker.id,
            context: 'country',
            countryName: countryName
        });
        html += `\n<a href="/stickers/${sticker.id}.html" class="sticker-strip-item" title="${escapeHtml(clubName)}"><img src="${thumbUrl}" alt="${escapeHtml(altText)}" data-sticker-id="${sticker.id}" class="featured-sticker-image" loading="lazy" decoding="async"></a>`;
    });
    html += '\n</div>\n</div>';
    return html;
}

// ─── Multilingual Meta Descriptions ──────────────────────────────────────────

const META_TEMPLATES = {
    'de': {
        club: '{club} -- {count} Fussball-Sticker gefunden. Durchsuche die Sammlung bei StickerHunt.',
        country: 'Fussball-Sticker von {clubCount} Vereinen aus {country}. {total}+ Sticker in der Datenbank.',
        sticker: '{club} Fussball-Sticker #{id} -- kannst du ihn identifizieren? StickerHunt.',
        city: 'Fussball-Sticker aus {city} -- {count} Sticker von Vereinen dieser Stadt.',
    },
    'nl': {
        club: '{club} -- {count} voetbalstickers gevonden. Bekijk de collectie op StickerHunt.',
        country: 'Voetbalstickers van {clubCount} clubs uit {country}. {total}+ stickers in de database.',
        sticker: '{club} voetbalsticker #{id} -- kun je deze herkennen? StickerHunt.',
        city: 'Voetbalstickers uit {city} -- {count} stickers van lokale clubs.',
    },
    'no': {
        club: '{club} -- {count} fotballklistremerker funnet. Utforsk samlingen pa StickerHunt.',
        country: 'Fotballklistremerker fra {clubCount} klubber i {country}. {total}+ klistremerker.',
        sticker: '{club} fotballklistremerke #{id} -- kan du identifisere det? StickerHunt.',
        city: 'Fotballklistremerker fra {city} -- {count} klistremerker fra lokale klubber.',
    },
    'sv': {
        club: '{club} -- {count} fotbollsklistermanerken hittade. Utforska samlingen pa StickerHunt.',
        country: 'Fotbollsklistermanerken fran {clubCount} klubbar i {country}. {total}+ klistermanerken.',
        sticker: '{club} fotbollsklistermanerke #{id} -- kan du identifiera det? StickerHunt.',
        city: 'Fotbollsklistermanerken fran {city} -- {count} klistermanerken fran lokala klubbar.',
    },
    'es': {
        club: '{club} -- {count} pegatinas de futbol encontradas. Explora la coleccion en StickerHunt.',
        country: 'Pegatinas de futbol de {clubCount} clubes en {country}. {total}+ pegatinas.',
        sticker: 'Pegatina de futbol #{id} de {club} -- puedes identificarla? StickerHunt.',
        city: 'Pegatinas de futbol en {city} -- {count} pegatinas de clubes locales.',
    },
    'pt': {
        club: '{club} -- {count} adesivos de futebol encontrados. Explore a colecao no StickerHunt.',
        country: 'Adesivos de futebol de {clubCount} clubes em {country}. {total}+ adesivos.',
        sticker: 'Adesivo de futebol #{id} de {club} -- consegue identificar? StickerHunt.',
        city: 'Adesivos de futebol em {city} -- {count} adesivos de clubes locais.',
    },
    'fr': {
        club: '{club} -- {count} autocollants de football trouves. Explorez la collection sur StickerHunt.',
        country: 'Autocollants de football de {clubCount} clubs en {country}. {total}+ autocollants.',
        sticker: 'Autocollant de football #{id} de {club} -- pouvez-vous identifier? StickerHunt.',
        city: 'Autocollants de football a {city} -- {count} autocollants de clubs locaux.',
    },
    'it': {
        club: '{club} -- {count} adesivi di calcio trovati. Esplora la collezione su StickerHunt.',
        country: 'Adesivi di calcio da {clubCount} club in {country}. {total}+ adesivi.',
        sticker: 'Adesivo di calcio #{id} di {club} -- riesci a identificarlo? StickerHunt.',
        city: 'Adesivi di calcio a {city} -- {count} adesivi da club locali.',
    },
    'hr': {
        club: '{club} -- {count} nogometnih naljepnica. Pregledaj kolekciju na StickerHunt.',
        country: 'Nogometne naljepnice iz {clubCount} klubova u {country}. {total}+ naljepnica.',
        sticker: 'Nogometna naljepnica #{id} od {club} -- mozes li prepoznati? StickerHunt.',
        city: 'Nogometne naljepnice u {city} -- {count} naljepnica lokalnih klubova.',
    },
    'pl': {
        club: '{club} -- {count} naklejek pilkarskich. Przegladaj kolekcje na StickerHunt.',
        country: 'Naklejki pilkarskie z {clubCount} klubow w {country}. {total}+ naklejek.',
        sticker: 'Naklejka pilkarska #{id} od {club} -- rozpoznasz? StickerHunt.',
        city: 'Naklejki pilkarskie w {city} -- {count} naklejek lokalnych klubow.',
    },
    'tr': {
        club: '{club} -- {count} futbol cikartmlasi. StickerHunt koleksiyonunu kesfet.',
        country: '{country} futbol cikartmlalari -- {clubCount} kulup, {total}+ cikartmla.',
        sticker: '{club} futbol cikartmlasi #{id} -- taniyabilir misin? StickerHunt.',
        city: '{city} futbol cikartmlalari -- {count} yerel kulup cikartmlasi.',
    },
    'sr': {
        club: '{club} -- {count} fudbalskih nalepnica. Pregledaj kolekciju na StickerHunt.',
        country: 'Fudbalske nalepnice iz {clubCount} klubova u {country}. {total}+ nalepnica.',
        sticker: 'Fudbalska nalepnica #{id} od {club} -- mozes li prepoznati? StickerHunt.',
        city: 'Fudbalske nalepnice u {city} -- {count} nalepnica lokalnih klubova.',
    },
    'id': {
        club: '{club} -- {count} stiker sepak bola ditemukan. Jelajahi koleksi di StickerHunt.',
        country: 'Stiker sepak bola dari {clubCount} klub di {country}. {total}+ stiker.',
        sticker: 'Stiker sepak bola #{id} dari {club} -- bisakah kamu mengenalinya? StickerHunt.',
        city: 'Stiker sepak bola di {city} -- {count} stiker dari klub lokal.',
    },
};

function fillTemplate(template, vars) {
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
        result = result.replaceAll(`{${key}}`, String(val ?? ''));
    }
    return result;
}

/**
 * Generate multilingual meta description tags.
 * @param {Object} params
 * @param {string} params.type - 'club' | 'country' | 'sticker' | 'city'
 * @param {string} params.countryCode - 3-letter country code
 * @param {Object} params.vars - Template variables: club, count, country, clubCount, total, id, city
 */
export function generateMultilingualMeta({ type, countryCode, vars }) {
    const localLang = COUNTRY_LANGUAGES[countryCode?.toUpperCase()] || null;
    const langs = new Set(SITE_LANGUAGES);
    if (localLang && localLang !== 'en') langs.add(localLang);

    let html = '';
    const localeMap = {
        'de': 'de_DE', 'nl': 'nl_NL', 'no': 'nb_NO', 'sv': 'sv_SE',
        'es': 'es_ES', 'pt': 'pt_PT', 'fr': 'fr_FR', 'it': 'it_IT',
        'hr': 'hr_HR', 'pl': 'pl_PL', 'tr': 'tr_TR', 'sr': 'sr_RS',
        'id': 'id_ID',
    };

    for (const lang of langs) {
        const templates = META_TEMPLATES[lang];
        if (!templates || !templates[type]) continue;
        const content = fillTemplate(templates[type], vars);
        html += `\n    <meta name="description" lang="${lang}" content="${escapeHtml(content)}">`;
    }

    // OG locale alternates
    html += '\n    <meta property="og:locale" content="en_GB">';
    for (const lang of langs) {
        const locale = localeMap[lang];
        if (locale) {
            html += `\n    <meta property="og:locale:alternate" content="${locale}">`;
        }
    }

    return html;
}

// ─── Paginated Supabase Fetch ────────────────────────────────────────────────

/**
 * Fetch all rows from a Supabase table with pagination.
 * @param {Object} supabase - Supabase client
 * @param {string} table - Table name
 * @param {string} select - Columns to select
 * @param {Function} [filterFn] - Optional: (query) => query.eq(...)
 */
export async function fetchAllPaginated(supabase, table, select, filterFn) {
    const PAGE_SIZE = 1000;
    let allData = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase.from(table).select(select).range(offset, offset + PAGE_SIZE - 1);
        if (filterFn) query = filterFn(query);
        const { data, error } = await query;
        if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
        if (data && data.length > 0) {
            allData = allData.concat(data);
            offset += PAGE_SIZE;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }
    return allData;
}
