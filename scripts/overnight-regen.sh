#!/bin/bash
# Overnight rollout: regenerate all sticker/club/country/city/index pages
# with new CLS/img-proxy/self-host-fonts templates.
#
# Strategy: 500 stickers per block, commit + push between blocks.
# Resumable via checkpoint file. Safe to re-run.
#
# Run with caffeinate to prevent macOS sleep:
#   caffeinate -i bash scripts/overnight-regen.sh > /tmp/overnight.log 2>&1 &
#
# Inspect progress: tail -f /tmp/overnight.log
# Stop cleanly: touch /tmp/regen-stop  (script exits at next block boundary)

# macOS bash 3.2 — keep `set -u` off so empty arrays don't trip us
# `set -e` would kill the run on a single sticker failure — also off intentionally

ROOT="/Users/victorzakharchenko/Claude Code/stickerhunt"
cd "$ROOT" || { echo "ROOT not found"; exit 1; }

CHECKPOINT="/tmp/regen-checkpoint.txt"
STOP="/tmp/regen-stop"
LOG="/tmp/regen.log"
ALL_IDS="/tmp/all-sticker-ids.txt"
BLOCK_SIZE="${BLOCK_SIZE:-500}"
MAX_BLOCKS="${MAX_BLOCKS:-9999}"
SKIP_FINAL="${SKIP_FINAL:-0}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Overnight regen started ==="
log "ROOT: $ROOT"
log "Block size: $BLOCK_SIZE"

# Build sorted list of all existing sticker IDs (from filesystem, not Supabase —
# means we skip stickers that no longer exist locally and avoid extra DB churn)
ls stickers/*.html | xargs -n1 basename | sed 's/\.html$//' | sort -n > "$ALL_IDS"
TOTAL=$(wc -l < "$ALL_IDS" | tr -d ' ')
log "Total sticker IDs to consider: $TOTAL"

# Resume point
if [ -f "$CHECKPOINT" ]; then
    LAST=$(cat "$CHECKPOINT")
    log "Resuming after checkpoint: id=$LAST"
else
    LAST=0
    log "Starting fresh"
fi

# Process blocks
BLOCK_NUM=0
PROCESSED=0
FAILED=0
START_TS=$(date +%s)

# We track per-block in temp arrays then commit
block_ids=()

while IFS= read -r id; do
    # Skip already processed
    if [ "$id" -le "$LAST" ]; then continue; fi
    # Stop request
    if [ -f "$STOP" ]; then
        log "STOP file detected — exiting before next sticker"
        rm -f "$STOP"
        break
    fi

    block_ids+=("$id")

    if [ "${#block_ids[@]}" -ge "$BLOCK_SIZE" ]; then
        BLOCK_NUM=$((BLOCK_NUM+1))
        FIRST=${block_ids[0]}
        LASTID=${block_ids[$((${#block_ids[@]}-1))]}
        # Pre-emptive stale-lock removal: a leftover .git/index.lock from any
        # source silently breaks `git add`, causing the block to "nothing to
        # commit (skipped)" and lose all 500 sticker files until manual rescue.
        # Clear it before staging; we never run concurrent git operations from
        # this script, so any lock present here is stale.
        if [ -f .git/index.lock ]; then
            log "    ⚠ stale .git/index.lock found — removing before stage"
            rm -f .git/index.lock
        fi
        log ">>> Block $BLOCK_NUM start: stickers #$FIRST..#$LASTID (${#block_ids[@]} items)"

        for bid in "${block_ids[@]}"; do
            if node scripts/generate-single-sticker.js "$bid" > /dev/null 2>&1; then
                PROCESSED=$((PROCESSED+1))
            else
                FAILED=$((FAILED+1))
                log "    FAIL: sticker #$bid"
            fi
        done

        # Commit + push
        git add stickers/ clubs/ countries/ >>/dev/null 2>&1
        if git diff --cached --quiet; then
            log "    nothing to commit (skipped)"
        else
            git commit -m "perf: batch regen stickers #${FIRST}-#${LASTID} (block ${BLOCK_NUM})" >>"$LOG" 2>&1
            if git push origin main >>"$LOG" 2>&1; then
                log "    pushed block $BLOCK_NUM"
            else
                log "    PUSH FAILED block $BLOCK_NUM — will retry next block"
            fi
        fi

        echo "$LASTID" > "$CHECKPOINT"
        ELAPSED=$(($(date +%s) - START_TS))
        log "<<< Block $BLOCK_NUM done. Total processed=$PROCESSED, failed=$FAILED, elapsed=${ELAPSED}s"

        block_ids=()

        if [ "$BLOCK_NUM" -ge "$MAX_BLOCKS" ]; then
            log "MAX_BLOCKS=$MAX_BLOCKS reached — exiting cleanly"
            exit 0
        fi
    fi
done < "$ALL_IDS"

# Tail block (any remaining < BLOCK_SIZE)
if [ "${#block_ids[@]}" -gt 0 ]; then
    BLOCK_NUM=$((BLOCK_NUM+1))
    FIRST=${block_ids[0]}
    LASTID=${block_ids[$((${#block_ids[@]}-1))]}
    log ">>> Tail block $BLOCK_NUM: stickers #$FIRST..#$LASTID (${#block_ids[@]} items)"
    for bid in "${block_ids[@]}"; do
        if node scripts/generate-single-sticker.js "$bid" > /dev/null 2>&1; then
            PROCESSED=$((PROCESSED+1))
        else
            FAILED=$((FAILED+1))
            log "    FAIL: sticker #$bid"
        fi
    done
    git add stickers/ clubs/ countries/ >>/dev/null 2>&1
    if ! git diff --cached --quiet; then
        git commit -m "perf: batch regen stickers #${FIRST}-#${LASTID} (tail block ${BLOCK_NUM})" >>"$LOG" 2>&1
        git push origin main >>"$LOG" 2>&1 && log "    pushed tail block"
    fi
    echo "$LASTID" > "$CHECKPOINT"
fi

if [ "$SKIP_FINAL" = "1" ]; then
    log "SKIP_FINAL=1 — skipping cities/index/sitemaps phase"
    exit 0
fi

# Final phase: cities + index (use full generator for index, separate for cities)
log "=== Final phase: cities + index.html + sitemaps ==="
if node scripts/generate-static-pages.js --homepage-only > /tmp/regen-homepage.log 2>&1; then
    log "    index + sitemaps generated"
else
    log "    INDEX/SITEMAPS GEN FAILED (see /tmp/regen-homepage.log)"
fi

if node scripts/generate-city-pages.js > /tmp/regen-cities.log 2>&1; then
    log "    city pages generated"
else
    log "    CITY GEN FAILED (see /tmp/regen-cities.log)"
fi

git add index.html cities/ sitemap*.xml >>/dev/null 2>&1
if ! git diff --cached --quiet; then
    git commit -m "perf: regen index + cities + sitemaps with new CLS/font templates" >>"$LOG" 2>&1
    git push origin main >>"$LOG" 2>&1 && log "    pushed final"
fi

TOTAL_ELAPSED=$(($(date +%s) - START_TS))
log "=== DONE. Processed=$PROCESSED, failed=$FAILED, blocks=$BLOCK_NUM, elapsed=${TOTAL_ELAPSED}s ==="

# Clean checkpoint on full success
if [ "$FAILED" -eq 0 ]; then
    rm -f "$CHECKPOINT"
    log "Checkpoint cleared (clean finish)"
else
    log "Checkpoint kept at $CHECKPOINT (rerun script to retry failed)"
fi
