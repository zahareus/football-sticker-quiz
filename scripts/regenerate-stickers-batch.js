#!/usr/bin/env node

/**
 * Regenerate specific sticker pages by IDs
 * Delegates to generate-single-sticker.js for each (ensures consistent output)
 * Usage: node regenerate-stickers-batch.js 2936,2937,2938,...
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __scriptsDir = dirname(fileURLToPath(import.meta.url));

const idsArg = process.argv[2];
if (!idsArg) {
    console.log('Usage: node regenerate-stickers-batch.js <sticker_ids>');
    console.log('Example: node regenerate-stickers-batch.js 100,101,102');
    process.exit(0);
}

const ids = idsArg.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
if (ids.length === 0) { console.log('No valid IDs'); process.exit(0); }

console.log(`🔄 Regenerating ${ids.length} sticker pages...\n`);

let success = 0, errors = 0;
for (const id of ids) {
    try {
        execSync(`node "${join(__scriptsDir, 'generate-single-sticker.js')}" ${id}`, {
            cwd: __scriptsDir,
            stdio: 'pipe',
            timeout: 30000
        });
        success++;
        process.stdout.write('.');
        if (success % 50 === 0) console.log(` ${success}/${ids.length}`);
    } catch (e) {
        console.error(`\n  ✗ Sticker #${id}: ${e.message.split('\n')[0]}`);
        errors++;
    }
}

console.log(`\n\n✅ Done! ${success} success, ${errors} errors out of ${ids.length}`);
