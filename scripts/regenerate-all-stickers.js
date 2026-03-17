#!/usr/bin/env node
/**
 * Regenerate ALL sticker pages in batches
 * Uses generate-single-sticker.js for each sticker
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabase = createClient(
    'https://rbmeslzlbsolkxnvesqb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibWVzbHpsYnNvbGt4bnZlc3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwODcxMzYsImV4cCI6MjA2MDY2MzEzNn0.cu-Qw0WoEslfKXXCiMocWFg6Uf1sK_cQYcyP2mT0-Nw'
);

let allIds = [];
let offset = 0;
while (true) {
    const { data } = await supabase.from('stickers').select('id').range(offset, offset + 999).order('id');
    if (!data || data.length === 0) break;
    allIds = allIds.concat(data.map(s => s.id));
    offset += 1000;
    if (data.length < 1000) break;
}

console.log(`Total stickers: ${allIds.length}`);

let success = 0, errors = 0;
for (let i = 0; i < allIds.length; i++) {
    const id = allIds[i];
    try {
        execSync(`node generate-single-sticker.js ${id}`, { cwd: __dirname, stdio: 'pipe', timeout: 30000 });
        success++;
        if ((i + 1) % 50 === 0) {
            console.log(`  ${i + 1}/${allIds.length} done (${success} ok, ${errors} err)`);
        }
    } catch (e) {
        errors++;
        console.error(`  ✗ Sticker #${id}: ${e.message.split('\n')[0].substring(0, 80)}`);
    }
}

console.log(`\n✅ Done! ${success} success, ${errors} errors out of ${allIds.length}`);
