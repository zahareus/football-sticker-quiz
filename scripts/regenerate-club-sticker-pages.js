#!/usr/bin/env node

/**
 * Regenerate sticker pages for a club
 * Used when club name changes and all sticker pages need to be updated
 * Delegates to generate-single-sticker.js for each sticker (ensures consistent output)
 *
 * Usage: node regenerate-club-sticker-pages.js <club_id>
 * Example: node regenerate-club-sticker-pages.js 123
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { createSupabaseClient } from './seo-helpers.js';

const __scriptsDir = dirname(fileURLToPath(import.meta.url));

const clubId = parseInt(process.argv[2] || process.env.CLUB_ID);

if (!clubId || isNaN(clubId)) {
    console.log('No club ID provided');
    process.exit(0);
}

const supabase = createSupabaseClient();

async function main() {
    console.log(`🔄 Regenerating sticker pages for club ID: ${clubId}\n`);

    const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single();
    if (!club) { console.log('Club not found'); process.exit(1); }
    console.log(`📦 Club: ${club.name}`);

    const { data: stickers } = await supabase
        .from('stickers')
        .select('id')
        .eq('club_id', clubId)
        .order('id', { ascending: true });

    if (!stickers || stickers.length === 0) {
        console.log('No stickers found');
        process.exit(0);
    }

    console.log(`Found ${stickers.length} stickers\n`);

    let success = 0, errors = 0;
    for (const sticker of stickers) {
        try {
            execSync(`node "${join(__scriptsDir, 'generate-single-sticker.js')}" ${sticker.id}`, {
                cwd: __scriptsDir,
                stdio: 'pipe',
                timeout: 30000
            });
            success++;
            if (success % 10 === 0) console.log(`  Progress: ${success}/${stickers.length}`);
        } catch (e) {
            console.error(`  ✗ Sticker #${sticker.id}: ${e.message.split('\n')[0]}`);
            errors++;
        }
    }

    console.log(`\n✅ Done! ${success} success, ${errors} errors out of ${stickers.length}`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
