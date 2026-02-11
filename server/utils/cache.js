import NodeCache from 'node-cache';

/**
 * Dashboard cache - TTL 2 phút
 * Dùng cho: /api/analytics/dashboard
 */
export const dashboardCache = new NodeCache({
    stdTTL: 120, // 120 giây = 2 phút
    checkperiod: 60, // Kiểm tra expired keys mỗi 60 giây
    useClones: false, // Tăng performance
    deleteOnExpire: true
});

/**
 * Heatmap cache - TTL 5 phút
 * Dùng cho: /api/analytics/heatmap
 */
export const heatmapCache = new NodeCache({
    stdTTL: 300, // 5 phút
    checkperiod: 120
});

/**
 * General cache - TTL 3 phút
 * Dùng cho các endpoints khác
 */
export const generalCache = new NodeCache({
    stdTTL: 180,
    checkperiod: 90
});

/**
 * Helper function: Tạo cache key unique cho mỗi user/query
 */
export function generateCacheKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    return `${prefix}:${sortedParams}`;
}

/**
 * Helper function: Clear cache theo pattern
 */
export function clearCacheByPattern(cache, pattern) {
    const keys = cache.keys();
    const matchedKeys = keys.filter(key => key.includes(pattern));
    matchedKeys.forEach(key => cache.del(key));
    return matchedKeys.length;
}

// Event listeners cho monitoring
dashboardCache.on('set', (key, value) => {
    console.log(`[Cache] SET ${key}`);
});

dashboardCache.on('expired', (key, value) => {
    console.log(`[Cache] EXPIRED ${key}`);
});

export default {
    dashboardCache,
    heatmapCache,
    generalCache,
    generateCacheKey,
    clearCacheByPattern
};
