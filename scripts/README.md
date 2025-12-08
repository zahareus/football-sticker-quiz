# Image Optimization Scripts

Scripts for optimizing sticker images for web performance.

## Quick Start

### 1. Install dependencies

```bash
cd scripts
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your SUPABASE_SERVICE_KEY
```

**Where to find Service Key:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to Settings > API
- Copy the `service_role` key (NOT the anon key!)

### 3. Run optimization

```bash
# Dry run first (see what would be done)
npm run optimize:dry

# Run actual optimization
npm run optimize
```

## What it does

The script processes all stickers in the database and creates optimized versions:

| Version | Suffix | Size | Use Case |
|---------|--------|------|----------|
| Web | `_web.webp` | 600x600 | Quiz, detail view, home page |
| Thumbnail | `_thumb.webp` | 150x150 | Catalogue gallery |

### Example

Original: `stickers/123.jpg` (2 MB)
- Creates: `stickers/123_web.webp` (~80 KB)
- Creates: `stickers/123_thumb.webp` (~15 KB)

**Typical savings: 70-95%**

## Automatic optimization for new uploads

For new stickers, you have two options:

### Option A: Manual (run script periodically)

```bash
# Run weekly/monthly to catch new uploads
npm run optimize
```

The script skips already-optimized images.

### Option B: Supabase Edge Function (automatic)

See `supabase-edge-function/` folder for a Deno function that automatically optimizes images when uploaded.

Deploy with:
```bash
supabase functions deploy optimize-image
```

## Troubleshooting

### "SUPABASE_SERVICE_KEY is required"
- Create `.env` file with your service role key
- Make sure you're using service_role key, not anon key

### "Failed to download image"
- Check if the image URL is correct in database
- Verify the bucket name matches (default: `stickers`)

### Script is slow
- Processing 3000 images takes ~30-60 minutes
- Adjust `BATCH_SIZE` in script for faster/slower processing
