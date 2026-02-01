#!/usr/bin/env node

/**
 * Regenerate all country pages with correct sticker counts
 * Usage: node regenerate-country-pages.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const PROJECT_ROOT_FOR_ENV = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(PROJECT_ROOT_FOR_ENV, '.env') });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://rbmeslzlbsolkxnvesqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw";
const BASE_URL = "https://stickerhunt.club";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Country names mapping
const COUNTRY_NAMES = {
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

function getCountryName(code) {
    return COUNTRY_NAMES[code?.toUpperCase()] || code;
}

function loadTemplate(templateName) {
    const templatePath = join(PROJECT_ROOT, 'templates', templateName);
    if (!existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    return readFileSync(templatePath, 'utf-8');
}

function replacePlaceholders(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        result = result.replaceAll(placeholder, value || '');
    }
    return result;
}

function generateBreadcrumbs(links) {
    return links.map(link => `<a href="${link.url}">${link.text}</a>`).join(' → ');
}

async function generateCountryPage(countryCode, clubs, stickerCountsByClub) {
    const template = loadTemplate('country-page.html');

    const countryName = getCountryName(countryCode);
    const pageTitle = `${countryName} - Sticker Catalogue`;
    const metaDescription = `Browse ${clubs.length} football clubs from ${countryName} in our sticker database. Explore club stickers and discover the complete collection.`;
    const canonicalUrl = `${BASE_URL}/countries/${countryCode.toUpperCase()}.html`;
    const keywords = `football stickers, ${countryName}, panini catalogue, football clubs, sticker collection`;

    const breadcrumbs = generateBreadcrumbs([
        { text: 'Catalogue', url: '/catalogue.html' },
        { text: countryName, url: `/countries/${countryCode.toUpperCase()}.html` }
    ]);

    // Add sticker counts and sort by name
    const clubsWithStickerCounts = clubs.map(club => ({
        ...club,
        stickerCount: stickerCountsByClub[club.id] || 0
    }));
    clubsWithStickerCounts.sort((a, b) => a.name.localeCompare(b.name));

    // Generate club list HTML
    let clubListHtml = '';
    clubsWithStickerCounts.forEach(club => {
        const countText = `(${club.stickerCount} sticker${club.stickerCount !== 1 ? 's' : ''})`;
        clubListHtml += `<li><a href="/clubs/${club.id}.html">${club.name} ${countText}</a></li>`;
    });

    const data = {
        PAGE_TITLE: pageTitle,
        META_DESCRIPTION: metaDescription,
        META_KEYWORDS: keywords,
        CANONICAL_URL: canonicalUrl,
        OG_IMAGE: 'https://stickerhunt.club/metash.png',
        COUNTRY_NAME: countryName,
        CLUB_COUNT: clubs.length,
        BREADCRUMBS: breadcrumbs,
        MAIN_HEADING: countryName,
        CLUB_LIST: clubListHtml
    };

    const html = replacePlaceholders(template, data);

    const outputDir = join(PROJECT_ROOT, 'countries');
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = join(outputDir, `${countryCode.toUpperCase()}.html`);
    writeFileSync(outputPath, html, 'utf-8');

    return outputPath;
}

async function main() {
    console.log('🚀 Regenerating all country pages...\n');

    try {
        // Fetch all clubs
        console.log('📦 Fetching clubs from Supabase...');
        const { data: clubs, error: clubsError } = await supabase
            .from('clubs')
            .select('*')
            .order('name');

        if (clubsError) throw new Error(`Error fetching clubs: ${clubsError.message}`);
        console.log(`  ✓ Fetched ${clubs.length} clubs`);

        // Fetch all stickers to count (with pagination - Supabase limits to 1000)
        console.log('📦 Fetching stickers for counting...');
        let allStickers = [];
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('stickers')
                .select('club_id')
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw new Error(`Error fetching stickers: ${error.message}`);

            if (data && data.length > 0) {
                allStickers = allStickers.concat(data);
                offset += PAGE_SIZE;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }
        const stickers = allStickers;
        console.log(`  ✓ Fetched ${stickers.length} stickers`);

        // Count stickers per club
        const stickerCountsByClub = {};
        stickers.forEach(s => {
            stickerCountsByClub[s.club_id] = (stickerCountsByClub[s.club_id] || 0) + 1;
        });

        // Group clubs by country
        const clubsByCountry = {};
        clubs.forEach(club => {
            const country = club.country.toUpperCase();
            if (!clubsByCountry[country]) {
                clubsByCountry[country] = [];
            }
            clubsByCountry[country].push(club);
        });

        const countries = Object.keys(clubsByCountry);
        console.log(`  ✓ Found ${countries.length} countries\n`);

        // Generate country pages
        console.log('🔨 Generating country pages...');
        let success = 0;
        let errors = 0;

        for (const countryCode of countries) {
            try {
                const countryClubs = clubsByCountry[countryCode];
                await generateCountryPage(countryCode, countryClubs, stickerCountsByClub);
                success++;
                console.log(`  ✓ ${getCountryName(countryCode)} (${countryClubs.length} clubs)`);
            } catch (error) {
                console.error(`  ✗ Error for ${countryCode}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n✅ Done!');
        console.log(`   Generated: ${success} country pages`);
        if (errors > 0) {
            console.log(`   Errors: ${errors}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
