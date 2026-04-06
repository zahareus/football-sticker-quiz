/**
 * Tests for parseMediaKeywords() and buildClubKeywords() from seo-helpers.js
 *
 * Run: node scripts/tests/test-keywords-sync.js
 */

import { parseMediaKeywords, buildClubKeywords } from '../seo-helpers.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  PASS: ${testName}`);
        passed++;
    } else {
        console.log(`  FAIL: ${testName}`);
        failed++;
    }
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
}

// ─── parseMediaKeywords ─────────────────────────────────────────────────────

console.log('\n=== parseMediaKeywords ===\n');

// 1. Normal: extracts hashtags, ignores plain text
{
    const result = parseMediaKeywords('#hashtag1 #hashtag2 some text');
    assert(
        arraysEqual(result, ['hashtag1', 'hashtag2']),
        'Normal: "#hashtag1 #hashtag2 some text" -> ["hashtag1", "hashtag2"]'
    );
}

// 2. Empty string
{
    const result = parseMediaKeywords('');
    assert(arraysEqual(result, []), 'Empty string -> []');
}

// 3. null/undefined
{
    const resultNull = parseMediaKeywords(null);
    const resultUndef = parseMediaKeywords(undefined);
    assert(arraysEqual(resultNull, []), 'null -> []');
    assert(arraysEqual(resultUndef, []), 'undefined -> []');
}

// 4. No hashtags
{
    const result = parseMediaKeywords('just plain text');
    assert(arraysEqual(result, []), 'No hashtags: "just plain text" -> []');
}

// 5. Mixed emoji and hashtags
{
    const result = parseMediaKeywords('⚽ #football #soccer 🏆');
    assert(
        arraysEqual(result, ['football', 'soccer']),
        'Mixed emoji and hashtags: "⚽ #football #soccer 🏆" -> ["football", "soccer"]'
    );
}

// 6. Single hashtag
{
    const result = parseMediaKeywords('#onlyone');
    assert(arraysEqual(result, ['onlyone']), 'Single hashtag: "#onlyone" -> ["onlyone"]');
}

// ─── buildClubKeywords ──────────────────────────────────────────────────────

console.log('\n=== buildClubKeywords ===\n');

// 1. Normal: contains expected keywords
{
    const result = buildClubKeywords('Real Madrid', 'Spain', '#realmadrid #rmcf');
    const mustContain = [
        'Real Madrid stickers',
        'Real Madrid football stickers',
        'Spain football stickers',
        'realmadrid',
        'rmcf',
    ];
    for (const kw of mustContain) {
        assert(result.includes(kw), `Normal: result contains "${kw}"`);
    }
}

// 2. Should NOT contain "panini"
{
    const result = buildClubKeywords('Real Madrid', 'Spain', '#realmadrid #rmcf');
    assert(
        !result.toLowerCase().includes('panini'),
        'Result does NOT contain "panini"'
    );
}

// 3. Without media (null): no trailing comma, valid string
{
    const result = buildClubKeywords('Bayern Munich', 'Germany', null);
    assert(typeof result === 'string', 'Without media: returns a string');
    assert(!result.endsWith(','), 'Without media: no trailing comma');
    assert(!result.includes(',,'), 'Without media: no double commas');
    assert(result.trim().length > 0, 'Without media: non-empty');
}

// 4. With empty media string: same as no media
{
    const resultEmpty = buildClubKeywords('Chelsea', 'England', '');
    const resultNull = buildClubKeywords('Chelsea', 'England', null);
    assert(resultEmpty === resultNull, 'Empty media string produces same result as null');
}

// 5. Output must be identical regardless of caller (simulating both generators)
{
    const call1 = buildClubKeywords('AC Milan', 'Italy', '#acmilan #rossoneri');
    const call2 = buildClubKeywords('AC Milan', 'Italy', '#acmilan #rossoneri');
    assert(call1 === call2, 'Identical inputs produce identical output (generator sync)');
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
