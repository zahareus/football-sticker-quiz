# Auto-Optimize Image Edge Function

Automatically creates optimized WebP versions when new stickers are uploaded.

## Setup Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link your project

```bash
cd /path/to/football-sticker-quiz
supabase link --project-ref rbmeslzlbsolkxnvesqb
```

### 4. Deploy the function

```bash
supabase functions deploy optimize-image
```

### 5. Set up Database Webhook

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Database** → **Webhooks**
4. Click **Create a new hook**
5. Configure:
   - **Name**: `optimize-sticker-image`
   - **Table**: `stickers`
   - **Events**: ✓ Insert
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://rbmeslzlbsolkxnvesqb.supabase.co/functions/v1/optimize-image`
   - **HTTP Headers**:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`

### 6. Test

Insert a new sticker and check:
- Function logs in Supabase Dashboard → Edge Functions → optimize-image → Logs
- Storage bucket for `_web.webp` and `_thumb.webp` files

## How it works

```
New sticker inserted → Database Webhook → Edge Function
                                              ↓
                                    Download original image
                                              ↓
                              Create 600x600 _web.webp version
                              Create 150x150 _thumb.webp version
                                              ↓
                                    Upload to Storage
```

## Alternative: Simple Cron approach

If Edge Functions are complex, you can run the Node.js script periodically:

```bash
# Add to crontab (runs daily at 3 AM)
0 3 * * * cd /path/to/scripts && npm run optimize >> /var/log/sticker-optimize.log 2>&1
```

The script automatically skips already-optimized images.
