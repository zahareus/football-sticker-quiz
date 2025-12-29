/**
 * Batch Image Optimizer for Football Sticker Quiz
 *
 * This script downloads images from Supabase Storage, optimizes them,
 * and uploads optimized versions with _web suffix.
 *
 * Usage:
 *   npm run optimize              # Run optimization for all stickers
 *   npm run optimize:dry          # Dry run (no uploads)
 *   node optimize-images.js --from=2500    # Start from sticker ID 2500
 *   node optimize-images.js --only=452,671 # Only process specific IDs
 *
 * Environment variables (create .env file):
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_KEY=your-service-role-key
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

// Parse command line arguments
function parseArgs() {
    const args = {
        dryRun: process.argv.includes('--dry-run'),
        fromId: null,
        onlyIds: null
    };

    for (const arg of process.argv) {
        if (arg.startsWith('--from=')) {
            args.fromId = parseInt(arg.split('=')[1], 10);
        }
        if (arg.startsWith('--only=')) {
            args.onlyIds = arg.split('=')[1].split(',').map(id => parseInt(id.trim(), 10));
        }
    }

    return args;
}

const ARGS = parseArgs();

// Configuration
const CONFIG = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://rbmeslzlbsolkxnvesqb.supabase.co',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY, // Service role key required!

    // Storage bucket name
    BUCKET_NAME: 'stickers',

    // Optimization settings
    WEB_IMAGE: {
        width: 600,           // Max width
        height: 600,          // Max height
        quality: 80,          // WebP quality (0-100)
        format: 'webp'        // Output format
    },

    THUMBNAIL: {
        width: 150,
        height: 150,
        quality: 75,
        format: 'webp'
    },

    // Processing settings
    BATCH_SIZE: 10,           // Process N images at a time
    DELAY_BETWEEN_BATCHES: 1000, // ms delay between batches

    // Suffixes for optimized versions
    WEB_SUFFIX: '_web',
    THUMB_SUFFIX: '_thumb',

    // Command line options
    DRY_RUN: ARGS.dryRun,
    FROM_ID: ARGS.fromId,
    ONLY_IDS: ARGS.onlyIds
};

// Validate configuration
if (!CONFIG.SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_KEY is required!');
    console.error('Create a .env file with your service role key:');
    console.error('  SUPABASE_SERVICE_KEY=your-service-role-key');
    console.error('\nYou can find this in Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

/**
 * Get stickers from database based on filters
 */
async function getAllStickers() {
    console.log('Fetching stickers from database...');

    // If --only parameter is provided, fetch only specific IDs
    if (CONFIG.ONLY_IDS && CONFIG.ONLY_IDS.length > 0) {
        console.log(`Fetching only specific IDs: ${CONFIG.ONLY_IDS.join(', ')}`);
        const { data, error } = await supabase
            .from('stickers')
            .select('id, image_url')
            .in('id', CONFIG.ONLY_IDS)
            .order('id', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch stickers: ${error.message}`);
        }

        console.log(`Found ${data.length} stickers`);
        return data || [];
    }

    // Otherwise fetch all (with optional --from filter)
    const allStickers = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        let query = supabase
            .from('stickers')
            .select('id, image_url')
            .order('id', { ascending: true });

        // Apply --from filter
        if (CONFIG.FROM_ID) {
            query = query.gte('id', CONFIG.FROM_ID);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch stickers: ${error.message}`);
        }

        if (!data || data.length === 0) break;

        allStickers.push(...data);
        offset += limit;

        if (data.length < limit) break;
    }

    console.log(`Found ${allStickers.length} stickers in database`);
    if (CONFIG.FROM_ID) {
        console.log(`(starting from ID ${CONFIG.FROM_ID})`);
    }
    return allStickers;
}

/**
 * Extract storage path from full URL
 * Example: https://xxx.supabase.co/storage/v1/object/public/stickers/123.jpg
 * Returns: 123.jpg
 */
function extractStoragePath(imageUrl) {
    if (!imageUrl) return null;

    // Match pattern: /storage/v1/object/public/bucket-name/path
    const match = imageUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (match) {
        return match[1];
    }

    // Try alternative pattern (just filename)
    const urlParts = imageUrl.split('/');
    return urlParts[urlParts.length - 1];
}

/**
 * Check if optimized version already exists by making HTTP HEAD request
 */
async function optimizedVersionExists(originalPath, suffix) {
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    const dirName = path.dirname(originalPath);

    const optimizedFileName = `${baseName}${suffix}.webp`;
    const optimizedPath = dirName === '.'
        ? optimizedFileName
        : `${dirName}/${optimizedFileName}`;

    // Build public URL
    const publicUrl = `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.BUCKET_NAME}/${optimizedPath}`;

    try {
        // HEAD request to check if file exists
        const response = await fetch(publicUrl, { method: 'HEAD' });
        return response.ok; // true if status 200-299
    } catch (error) {
        return false;
    }
}

/**
 * Download image from Supabase Storage
 */
async function downloadImage(storagePath) {
    const { data, error } = await supabase.storage
        .from(CONFIG.BUCKET_NAME)
        .download(storagePath);

    if (error) {
        throw new Error(`Failed to download ${storagePath}: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
}

/**
 * Optimize image using sharp
 */
async function optimizeImage(imageBuffer, options) {
    const { width, height, quality, format } = options;

    let pipeline = sharp(imageBuffer)
        .resize(width, height, {
            fit: 'inside',           // Maintain aspect ratio
            withoutEnlargement: true // Don't upscale small images
        });

    if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
        pipeline = pipeline.jpeg({ quality });
    }

    return pipeline.toBuffer();
}

/**
 * Upload optimized image to Supabase Storage
 */
async function uploadOptimized(buffer, originalPath, suffix) {
    const ext = path.extname(originalPath);
    const baseName = path.basename(originalPath, ext);
    const dirName = path.dirname(originalPath);

    const optimizedPath = dirName === '.'
        ? `${baseName}${suffix}.webp`
        : `${dirName}/${baseName}${suffix}.webp`;

    const { error } = await supabase.storage
        .from(CONFIG.BUCKET_NAME)
        .upload(optimizedPath, buffer, {
            contentType: 'image/webp',
            upsert: true
        });

    if (error) {
        throw new Error(`Failed to upload ${optimizedPath}: ${error.message}`);
    }

    return optimizedPath;
}

/**
 * Process a single sticker
 */
async function processSticker(sticker) {
    const storagePath = extractStoragePath(sticker.image_url);

    if (!storagePath) {
        return { id: sticker.id, status: 'skipped', reason: 'Invalid URL' };
    }

    try {
        // Check if already optimized
        const webExists = await optimizedVersionExists(storagePath, CONFIG.WEB_SUFFIX);
        const thumbExists = await optimizedVersionExists(storagePath, CONFIG.THUMB_SUFFIX);

        if (webExists && thumbExists) {
            return { id: sticker.id, status: 'exists', path: storagePath };
        }

        if (CONFIG.DRY_RUN) {
            return {
                id: sticker.id,
                status: 'dry-run',
                path: storagePath,
                wouldCreate: { web: !webExists, thumb: !thumbExists }
            };
        }

        // Download original
        const originalBuffer = await downloadImage(storagePath);
        const originalSize = originalBuffer.length;

        const results = { id: sticker.id, status: 'optimized', path: storagePath };

        // Create web version
        if (!webExists) {
            const webBuffer = await optimizeImage(originalBuffer, CONFIG.WEB_IMAGE);
            const webPath = await uploadOptimized(webBuffer, storagePath, CONFIG.WEB_SUFFIX);
            results.web = {
                path: webPath,
                originalSize,
                optimizedSize: webBuffer.length,
                savings: Math.round((1 - webBuffer.length / originalSize) * 100) + '%'
            };
        }

        // Create thumbnail
        if (!thumbExists) {
            const thumbBuffer = await optimizeImage(originalBuffer, CONFIG.THUMBNAIL);
            const thumbPath = await uploadOptimized(thumbBuffer, storagePath, CONFIG.THUMB_SUFFIX);
            results.thumb = {
                path: thumbPath,
                optimizedSize: thumbBuffer.length
            };
        }

        return results;

    } catch (error) {
        return { id: sticker.id, status: 'error', error: error.message, path: storagePath };
    }
}

/**
 * Process stickers in batches
 */
async function processBatches(stickers) {
    const results = {
        total: stickers.length,
        processed: 0,
        optimized: 0,
        skipped: 0,
        errors: 0,
        exists: 0,
        totalSavings: 0
    };

    const errors = [];

    for (let i = 0; i < stickers.length; i += CONFIG.BATCH_SIZE) {
        const batch = stickers.slice(i, i + CONFIG.BATCH_SIZE);
        const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(stickers.length / CONFIG.BATCH_SIZE);

        console.log(`\nProcessing batch ${batchNum}/${totalBatches} (stickers ${i + 1}-${Math.min(i + CONFIG.BATCH_SIZE, stickers.length)})`);

        const batchResults = await Promise.all(batch.map(processSticker));

        for (const result of batchResults) {
            results.processed++;

            switch (result.status) {
                case 'optimized':
                    results.optimized++;
                    if (result.web) {
                        const savings = result.web.originalSize - result.web.optimizedSize;
                        results.totalSavings += savings;
                        console.log(`  ✓ #${result.id}: ${result.web.savings} saved (${formatBytes(result.web.originalSize)} → ${formatBytes(result.web.optimizedSize)})`);
                    }
                    break;
                case 'exists':
                    results.exists++;
                    console.log(`  - #${result.id}: Already optimized`);
                    break;
                case 'skipped':
                    results.skipped++;
                    console.log(`  ⚠ #${result.id}: Skipped - ${result.reason}`);
                    break;
                case 'dry-run':
                    console.log(`  [DRY RUN] #${result.id}: Would create web=${result.wouldCreate.web}, thumb=${result.wouldCreate.thumb}`);
                    break;
                case 'error':
                    results.errors++;
                    errors.push(result);
                    console.log(`  ✗ #${result.id}: Error - ${result.error}`);
                    break;
            }
        }

        // Progress
        const progress = Math.round((results.processed / results.total) * 100);
        console.log(`Progress: ${progress}% (${results.processed}/${results.total})`);

        // Delay between batches
        if (i + CONFIG.BATCH_SIZE < stickers.length) {
            await new Promise(r => setTimeout(r, CONFIG.DELAY_BETWEEN_BATCHES));
        }
    }

    return { results, errors };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Main function
 */
async function main() {
    console.log('='.repeat(60));
    console.log('Football Sticker Image Optimizer');
    console.log('='.repeat(60));

    if (CONFIG.DRY_RUN) {
        console.log('\n⚠️  DRY RUN MODE - No files will be uploaded\n');
    }

    console.log('Configuration:');
    console.log(`  Bucket: ${CONFIG.BUCKET_NAME}`);
    console.log(`  Web image: ${CONFIG.WEB_IMAGE.width}x${CONFIG.WEB_IMAGE.height}, quality ${CONFIG.WEB_IMAGE.quality}`);
    console.log(`  Thumbnail: ${CONFIG.THUMBNAIL.width}x${CONFIG.THUMBNAIL.height}, quality ${CONFIG.THUMBNAIL.quality}`);
    console.log(`  Batch size: ${CONFIG.BATCH_SIZE}`);

    try {
        // Get all stickers
        const stickers = await getAllStickers();

        if (stickers.length === 0) {
            console.log('No stickers found in database.');
            return;
        }

        // Process
        console.log('\nStarting optimization...');
        const startTime = Date.now();

        const { results, errors } = await processBatches(stickers);

        const duration = Math.round((Date.now() - startTime) / 1000);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total stickers: ${results.total}`);
        console.log(`Optimized: ${results.optimized}`);
        console.log(`Already existed: ${results.exists}`);
        console.log(`Skipped: ${results.skipped}`);
        console.log(`Errors: ${results.errors}`);
        console.log(`Total space saved: ${formatBytes(results.totalSavings)}`);
        console.log(`Duration: ${duration} seconds`);

        if (errors.length > 0) {
            console.log('\nErrors:');
            errors.forEach(e => console.log(`  - Sticker #${e.id}: ${e.error}`));
        }

    } catch (error) {
        console.error('Fatal error:', error.message);
        process.exit(1);
    }
}

main();
