(function() {
    const SESSION_KEY = 'sh_seen_stickers';
    const DWELL_MS = 500;
    const FLUSH_INTERVAL_MS = 2000;
    const IO_THRESHOLD = 0.5;
    const QUERY_BATCH_SIZE = 150;
    const BOT_UA_RE = /bot|crawler|spider|crawling|headless/i;
    const SUPABASE_URL = window.SharedUtils?.CONFIG?.SUPABASE_URL || 'https://rbmeslzlbsolkxnvesqb.supabase.co';
    const SUPABASE_ANON_KEY = window.SharedUtils?.CONFIG?.SUPABASE_ANON_KEY || '';
    const FORCE_ENABLE = window.__STICKERHUNT_ALLOW_VIEW_TRACKING__ === true;
    const BADGES_ENABLED = isBadgePage(window.location.pathname || '/');

    if (!FORCE_ENABLE && (navigator.webdriver === true || BOT_UA_RE.test(navigator.userAgent || ''))) {
        return;
    }

    let flushTimeout = null;
    let supabaseClient = null;
    let badgeRefreshQueued = false;

    const seenStickerIds = loadSeenStickerIds();
    const pendingStickerIds = new Set();
    const dwellTimers = new WeakMap();
    const observedImages = new WeakSet();
    const viewCountCache = new Map();
    const observer = typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(handleIntersections, { threshold: [0, IO_THRESHOLD, 1] })
        : null;

    function isBadgePage(path) {
        // Badge is rendered only on the single sticker page. Tracking still
        // fires everywhere else (catalogue, club, country, city, homepage,
        // quiz, battle) — only the visual counter is scoped to /stickers/{id}.
        return /^\/stickers\/\d+\.html$/i.test(path);
    }

    function loadSeenStickerIds() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return new Set();
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return new Set();
            return new Set(parsed.map(Number).filter(Number.isInteger));
        } catch (error) {
            console.warn('Failed to load seen sticker session state:', error);
            return new Set();
        }
    }

    function persistSeenStickerIds() {
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(seenStickerIds)));
        } catch (error) {
            console.warn('Failed to persist seen sticker session state:', error);
        }
    }

    function normalizeStickerId(value) {
        const id = Number.parseInt(value, 10);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    function normalizeClubId(value) {
        const id = Number.parseInt(value, 10);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    function inferStickerId(img) {
        const directId = normalizeStickerId(img.dataset.stickerId);
        if (directId) return directId;

        const link = img.closest('a[href]');
        if (link) {
            const match = link.getAttribute('href').match(/\/stickers\/(\d+)\.html(?:$|[?#])/);
            if (match) return normalizeStickerId(match[1]);
        }

        const pageMatch = window.location.pathname.match(/^\/stickers\/(\d+)\.html$/);
        if (pageMatch && img.classList.contains('sticker-detail-image')) {
            return normalizeStickerId(pageMatch[1]);
        }

        return null;
    }

    function inferClubId(img) {
        const link = img.closest('a[href]');
        if (!link) return null;

        const match = link.getAttribute('href').match(/\/clubs\/(\d+)\.html(?:$|[?#])/);
        return match ? normalizeClubId(match[1]) : null;
    }

    function ensureStickerId(img) {
        const stickerId = inferStickerId(img);
        if (stickerId && !img.dataset.stickerId) {
            img.dataset.stickerId = String(stickerId);
        }
        return stickerId;
    }

    function getTrackableImages(root = document) {
        if (!root) return [];
        if (root.nodeType === Node.ELEMENT_NODE && root.tagName === 'IMG') {
            return [root];
        }
        if (typeof root.querySelectorAll === 'function') {
            return Array.from(root.querySelectorAll('img'));
        }
        return [];
    }

    function chunkArray(values, size) {
        const chunks = [];
        for (let index = 0; index < values.length; index += size) {
            chunks.push(values.slice(index, index + size));
        }
        return chunks;
    }

    function getBadgeHost(img) {
        return img.closest('.sticker-detail-image-container, .sticker-preview-link, .hp-sticker-card, .cat-club-card, .cat-country-card')
            || img.parentElement;
    }

    function formatViewCount(value) {
        return Number(value || 0).toLocaleString('en-US');
    }

    function ensureBadge(img, count = 0) {
        if (!BADGES_ENABLED) {
            return;
        }

        const host = getBadgeHost(img);
        if (!host) {
            return;
        }

        host.classList.add('sticker-view-host');

        let badge = host.querySelector('.sticker-view-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'sticker-view-badge';
            badge.innerHTML = `
                <span class="sticker-view-badge-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M1.5 12s3.75-6.75 10.5-6.75S22.5 12 22.5 12 18.75 18.75 12 18.75 1.5 12 1.5 12Z"></path>
                        <circle cx="12" cy="12" r="3.25"></circle>
                    </svg>
                </span>
                <span class="sticker-view-badge-count">0</span>
            `;
            host.appendChild(badge);
        }

        const countNode = badge.querySelector('.sticker-view-badge-count');
        if (countNode) {
            countNode.textContent = formatViewCount(count);
        }
    }

    function refreshBadgeForImage(img) {
        if (!BADGES_ENABLED) {
            return;
        }

        const stickerId = ensureStickerId(img);
        if (stickerId) {
            ensureBadge(img, viewCountCache.get(stickerId) || 0);
            return;
        }

        if (inferClubId(img)) {
            ensureBadge(img, 0);
        }
    }

    function clearDwellTimer(img) {
        const timerId = dwellTimers.get(img);
        if (timerId) {
            clearTimeout(timerId);
            dwellTimers.delete(img);
        }
    }

    function isVisibleEnough(img) {
        const rect = img.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = rect.width * rect.height;

        return totalArea > 0 && (visibleArea / totalArea) >= IO_THRESHOLD;
    }

    function markSeen(stickerId) {
        seenStickerIds.add(stickerId);
        persistSeenStickerIds();
    }

    function queueStickerId(stickerId) {
        if (!stickerId || seenStickerIds.has(stickerId) || pendingStickerIds.has(stickerId)) {
            return;
        }

        pendingStickerIds.add(stickerId);
        markSeen(stickerId);
        scheduleFlush();
    }

    function scheduleDwell(img, stickerId) {
        if (!stickerId || seenStickerIds.has(stickerId) || pendingStickerIds.has(stickerId)) {
            clearDwellTimer(img);
            return;
        }

        clearDwellTimer(img);

        const timerId = window.setTimeout(() => {
            dwellTimers.delete(img);
            if (isVisibleEnough(img)) {
                queueStickerId(stickerId);
            }
        }, DWELL_MS);

        dwellTimers.set(img, timerId);
    }

    function registerImage(img) {
        const stickerId = ensureStickerId(img);
        refreshBadgeForImage(img);

        if (!stickerId || seenStickerIds.has(stickerId)) {
            return;
        }

        if (observer) {
            if (!observedImages.has(img)) {
                observer.observe(img);
                observedImages.add(img);
            }
        } else if (isVisibleEnough(img)) {
            scheduleDwell(img, stickerId);
        }
    }

    function handleIntersections(entries) {
        entries.forEach(entry => {
            const img = entry.target;
            const stickerId = ensureStickerId(img);

            if (!stickerId || seenStickerIds.has(stickerId) || pendingStickerIds.has(stickerId)) {
                clearDwellTimer(img);
                return;
            }

            if (entry.isIntersecting && entry.intersectionRatio >= IO_THRESHOLD) {
                scheduleDwell(img, stickerId);
            } else {
                clearDwellTimer(img);
            }
        });
    }

    function getSupabaseClient() {
        if (supabaseClient) return supabaseClient;

        if (window.SharedUtils?.getSupabaseClient) {
            supabaseClient = window.SharedUtils.getSupabaseClient();
        } else if (window.SharedUtils?.initSupabaseClient) {
            supabaseClient = window.SharedUtils.initSupabaseClient();
        } else if (window.supabase?.createClient && SUPABASE_ANON_KEY) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        return supabaseClient;
    }

    async function fetchStickerViewCounts(ids) {
        if (ids.length === 0) {
            return [];
        }

        const client = getSupabaseClient();
        if (!client) {
            return [];
        }

        const rows = [];
        for (const chunk of chunkArray(ids, QUERY_BATCH_SIZE)) {
            const { data, error } = await client
                .from('stickers')
                .select('id, view_count')
                .in('id', chunk);

            if (error) {
                throw error;
            }

            rows.push(...(data || []));
        }

        return rows;
    }

    async function fetchClubPreviewStickers(clubIds) {
        if (clubIds.length === 0) {
            return new Map();
        }

        const client = getSupabaseClient();
        if (!client) {
            return new Map();
        }

        const bestByClubId = new Map();
        for (const chunk of chunkArray(clubIds, QUERY_BATCH_SIZE)) {
            let offset = 0;
            while (true) {
                const { data, error } = await client
                    .from('stickers')
                    .select('id, club_id, rating, view_count')
                    .in('club_id', chunk)
                    .order('rating', { ascending: false })
                    .order('id', { ascending: false })
                    .range(offset, offset + 999);

                if (error) {
                    throw error;
                }

                const rows = data || [];
                rows.forEach(row => {
                    if (!row?.club_id || bestByClubId.has(row.club_id)) {
                        return;
                    }

                    bestByClubId.set(row.club_id, {
                        id: row.id,
                        viewCount: row.view_count || 0
                    });
                });

                if (rows.length < 1000) {
                    break;
                }

                offset += 1000;
            }
        }

        return bestByClubId;
    }

    async function refreshBadges() {
        if (!BADGES_ENABLED) {
            return;
        }

        const stickerIdsToFetch = new Set();
        const clubIdsToFetch = new Set();
        const images = getTrackableImages(document);

        images.forEach(img => {
            const stickerId = ensureStickerId(img);
            if (stickerId) {
                ensureBadge(img, viewCountCache.get(stickerId) || 0);
                if (!viewCountCache.has(stickerId)) {
                    stickerIdsToFetch.add(stickerId);
                }
                return;
            }

            const clubId = inferClubId(img);
            if (clubId) {
                ensureBadge(img, 0);
                clubIdsToFetch.add(clubId);
            }
        });

        try {
            const stickerRows = await fetchStickerViewCounts(Array.from(stickerIdsToFetch));
            stickerRows.forEach(row => {
                viewCountCache.set(row.id, row.view_count || 0);
            });

            const resolvedClubStickers = await fetchClubPreviewStickers(Array.from(clubIdsToFetch));
            images.forEach(img => {
                if (ensureStickerId(img)) {
                    return;
                }

                const clubId = inferClubId(img);
                if (!clubId) {
                    return;
                }

                const resolved = resolvedClubStickers.get(clubId);
                if (!resolved) {
                    return;
                }

                img.dataset.stickerId = String(resolved.id);
                viewCountCache.set(resolved.id, resolved.viewCount || 0);
                ensureBadge(img, resolved.viewCount || 0);
                registerImage(img);
            });

            images.forEach(img => {
                const stickerId = ensureStickerId(img);
                if (stickerId) {
                    ensureBadge(img, viewCountCache.get(stickerId) || 0);
                }
            });
        } catch (error) {
            console.warn('Failed to load sticker view counts:', error);
        }
    }

    function scheduleBadgeRefresh() {
        if (!BADGES_ENABLED || badgeRefreshQueued) {
            return;
        }

        badgeRefreshQueued = true;
        window.requestAnimationFrame(() => {
            badgeRefreshQueued = false;
            refreshBadges();
        });
    }

    async function flushWithKeepalive(ids) {
        if (!SUPABASE_ANON_KEY) {
            throw new Error('Missing Supabase anon key for keepalive flush');
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_sticker_views`, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ ids })
        });

        if (!response.ok) {
            throw new Error(`Keepalive flush failed with status ${response.status}`);
        }
    }

    async function flushWithSupabase(ids) {
        const client = getSupabaseClient();
        if (!client) {
            return flushWithKeepalive(ids);
        }

        const { error } = await client.rpc('increment_sticker_views', { ids });
        if (error) {
            throw error;
        }
    }

    async function flushPending(useKeepalive = false) {
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }

        if (pendingStickerIds.size === 0) {
            return;
        }

        const ids = Array.from(pendingStickerIds);
        pendingStickerIds.clear();

        try {
            if (useKeepalive) {
                await flushWithKeepalive(ids);
            } else {
                await flushWithSupabase(ids);
            }

            window.StickerViewTracker.lastFlushedIds = ids.slice();
            window.dispatchEvent(new CustomEvent('sticker-views-flushed', {
                detail: { ids: ids.slice() }
            }));
        } catch (error) {
            console.warn('Failed to flush sticker views:', error);
            ids.forEach(id => pendingStickerIds.add(id));

            if (!useKeepalive) {
                scheduleFlush();
            }
        }
    }

    function scheduleFlush() {
        if (flushTimeout || pendingStickerIds.size === 0) {
            return;
        }

        flushTimeout = window.setTimeout(() => {
            flushPending(false);
        }, FLUSH_INTERVAL_MS);
    }

    function handleSingleStickerPage() {
        const match = window.location.pathname.match(/^\/stickers\/(\d+)\.html$/);
        if (!match) return;

        const stickerId = normalizeStickerId(match[1]);
        if (!stickerId) return;

        const detailImage = document.querySelector('.sticker-detail-image');
        if (detailImage && !detailImage.dataset.stickerId) {
            detailImage.dataset.stickerId = String(stickerId);
        }

        queueStickerId(stickerId);
    }

    function refresh(root = document) {
        getTrackableImages(root).forEach(registerImage);
        scheduleBadgeRefresh();
    }

    function observeDomChanges() {
        if (typeof MutationObserver !== 'function') return;

        const mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.target.tagName === 'IMG') {
                    registerImage(mutation.target);
                    scheduleBadgeRefresh();
                }

                mutation.addedNodes.forEach(node => {
                    refresh(node);
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-sticker-id', 'src']
        });
    }

    function init() {
        handleSingleStickerPage();
        refresh(document);
        observeDomChanges();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushPending(true);
        }
    });

    window.addEventListener('pagehide', () => {
        flushPending(true);
    });

    window.StickerViewTracker = {
        flushPending,
        refresh,
        refreshBadges,
        lastFlushedIds: []
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
