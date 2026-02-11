import express from 'express';
import Objective from '../models/Objective.js';
import KeyResult from '../models/KPI.js';
import Blocker from '../models/Blocker.js';
import CheckInHistory from '../models/CheckInHistory.js';
import authMiddleware from '../middleware/auth.js';
import { dashboardCache, heatmapCache, generateCacheKey } from '../utils/cache.js';

const router = express.Router();

// Helper: Calculate Expected Progress based on time
const calculateExpectedProgress = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();

    if (now < start) return 0;
    if (now > end) return 100;

    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / totalDuration) * 100);
};

// BE-01: Get Health Score
router.get('/health-score', authMiddleware, async (req, res) => {
    try {
        const { role, id: userId, department } = req.user;
        const cacheKey = generateCacheKey('health-score', { role, userId, department });

        const cachedData = dashboardCache.get(cacheKey);
        if (cachedData) {
            return res.json({ ...cachedData, _meta: { cached: true, source: 'cache' } });
        }

        let query = {};

        // BE-05: Filter by role
        if (role === 'EMPLOYEE') {
            query.ownerId = userId;
        } else if (role === 'MANAGER') {
            query.department = department; // Manager sees department data
        }
        // CEO/ADMIN sees all (empty query)

        const okrs = await Objective.find(query);
        if (!okrs.length) return res.json({ score: 0, details: {} });

        // 1. Avg Progress (40%)
        const totalProgress = okrs.reduce((sum, o) => sum + (o.progress || 0), 0);
        const avgProgress = totalProgress / okrs.length;

        // 2. On-Track KR Rate (20%) - Simplification: If objective progress >= expected
        let onTrackCount = 0;
        okrs.forEach(o => {
            const expected = calculateExpectedProgress(o.startDate || o.createdAt, o.endDate); // Fallback to createdAt
            if (o.progress >= expected) onTrackCount++;
        });
        const onTrackRate = (onTrackCount / okrs.length) * 100;

        // 3. Resolved Blocker Rate (20%)
        const blockers = await Blocker.find({ objectiveId: { $in: okrs.map(o => o._id) } });
        const resolvedBlockers = blockers.filter(b => b.status === 'RESOLVED').length;
        const blockerRate = blockers.length > 0 ? (resolvedBlockers / blockers.length) * 100 : 100; // No blockers = 100% good

        // 4. Check-in Timeliness (20%) - Last 14 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const recentCheckins = await CheckInHistory.distinct('objectiveId', {
            objectiveId: { $in: okrs.map(o => o._id) },
            checkinDate: { $gte: twoWeeksAgo }
        });
        const checkinRate = (recentCheckins.length / okrs.length) * 100;

        // Total Score
        const score = Math.round(
            (avgProgress * 0.4) +
            (onTrackRate * 0.2) +
            (blockerRate * 0.2) +
            (checkinRate * 0.2)
        );

        const result = {
            score,
            components: { avgProgress, onTrackRate, blockerRate, checkinRate },
            okrCount: okrs.length
        };

        dashboardCache.set(cacheKey, result);

        res.json({
            ...result,
            _meta: { cached: false, source: 'database' }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error calculating health score' });
    }
});

// BE-02: Get At Risk OKRs
router.get('/at-risk', authMiddleware, async (req, res) => {
    try {
        const { role, id: userId, department } = req.user;
        let query = {};
        if (role === 'EMPLOYEE') query.ownerId = userId;
        else if (role === 'MANAGER') query.department = department;

        const okrs = await Objective.find(query);
        const atRiskList = [];

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Get all open blockers for these OKRs
        const openBlockers = await Blocker.find({
            objectiveId: { $in: okrs.map(o => o._id) },
            status: 'OPEN'
        });
        const blockerMap = {};
        openBlockers.forEach(b => blockerMap[b.objectiveId.toString()] = true);

        // Check check-in history for all these OKRs (bulk query)
        const recentCheckins = await CheckInHistory.distinct('objectiveId', {
            objectiveId: { $in: okrs.map(o => o._id) },
            checkinDate: { $gte: twoWeeksAgo }
        });
        const hasRecentCheckinMap = {};
        recentCheckins.forEach(id => hasRecentCheckinMap[id.toString()] = true);

        for (const okr of okrs) {
            const expected = calculateExpectedProgress(okr.startDate || okr.createdAt, okr.endDate);
            const isBehind = (okr.progress || 0) < expected - 10; // Margin 10%
            const noCheckin = !hasRecentCheckinMap[okr._id.toString()];
            const hasBlocker = blockerMap[okr._id.toString()];

            if (isBehind || noCheckin || hasBlocker) {
                atRiskList.push({
                    ...okr.toObject(),
                    riskFactors: {
                        isBehind,
                        noCheckin,
                        hasBlocker,
                        expectedProgress: expected
                    }
                });
            }
        }

        res.json(atRiskList);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// BE-03: Expected vs Actual (Time Series)
router.get('/progress-comparison/:id', authMiddleware, async (req, res) => {
    try {
        const okr = await Objective.findById(req.params.id);
        if (!okr) return res.status(404).json({ message: 'OKR not found' });

        // Build Expected Line (Linear)
        const start = new Date(okr.startDate || okr.createdAt);
        const end = new Date(okr.endDate || new Date(new Date().getFullYear(), 11, 31)); // Fallback end of year

        // Generate data points every 10% of duration or every week
        // For simplicity: Start, Current, End
        const expectedSeries = [
            { date: start, value: 0 },
            { date: end, value: 100 }
        ];

        // Build Actual Line (From History)
        const history = await CheckInHistory.find({ objectiveId: okr._id }).sort({ checkinDate: 1 });
        const actualSeries = history.map(h => ({
            date: h.checkinDate,
            value: h.newValue,
            comment: h.comment
        }));

        // Add current state if newest history is old
        actualSeries.push({ date: new Date(), value: okr.progress });

        res.json({ expectedSeries, actualSeries });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// BE-04: Alignment Score
router.get('/alignment', authMiddleware, async (req, res) => {
    try {
        const { role, department } = req.user;
        let query = {};
        if (role === 'MANAGER') query.department = department;

        const totalOkrs = await Objective.countDocuments(query);
        const alignedOkrs = await Objective.countDocuments({ ...query, parentId: { $ne: null } });

        const score = totalOkrs > 0 ? Math.round((alignedOkrs / totalOkrs) * 100) : 0;

        res.json({ score, totalOkrs, alignedOkrs });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// BE-06: Department Analytics (Real Data for Heatmap)
router.get('/department-stats', authMiddleware, async (req, res) => {
    try {
        const cacheKey = generateCacheKey('department-stats', { role: req.user.role, dept: req.user.department });
        const cachedData = heatmapCache.get(cacheKey);
        if (cachedData) {
            return res.json({ departments: cachedData, _meta: { cached: true, source: 'cache' } });
        }

        const okrs = await Objective.find({});
        const blockers = await Blocker.find({ status: 'OPEN' });

        // Group by Department
        const deptMap = {};

        okrs.forEach(okr => {
            const dept = okr.department || 'Other';
            if (!deptMap[dept]) {
                deptMap[dept] = { totalProgress: 0, count: 0, blockerCount: 0 };
            }
            deptMap[dept].totalProgress += (okr.progress || 0);
            deptMap[dept].count += 1;
        });

        // Count blockers per department
        blockers.forEach(b => {
            const okr = okrs.find(o => o._id.toString() === b.objectiveId.toString());
            if (okr && okr.department) {
                if (deptMap[okr.department]) {
                    deptMap[okr.department].blockerCount += 1;
                }
            }
        });

        // Calculate Stats
        const results = Object.keys(deptMap).map(dept => {
            const data = deptMap[dept];
            const avgProgress = Math.round(data.totalProgress / data.count);

            // Simple Health Score for Dept: Progress - (Blockers * 10)
            let healthScore = avgProgress - (data.blockerCount * 10);
            if (healthScore < 0) healthScore = 0;
            if (healthScore > 100) healthScore = 100;

            return {
                name: dept,
                progress: avgProgress,
                healthScore: healthScore,
                okrCount: data.count,
                blockerCount: data.blockerCount
            };
        });

        heatmapCache.set(cacheKey, results);

        res.json({
            departments: results,
            _meta: { cached: false, source: 'database' }
        });
    } catch (err) {
        console.error("Dept Stats Error", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// BE-06: Department Analytics (Real Data for Heatmap)
// ... already updated ...

// BE-07: Clear Cache (Admin only)
router.post('/cache/clear', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }

        const { type } = req.body; // 'dashboard', 'heatmap', 'all'

        let cleared = 0;

        if (type === 'dashboard' || type === 'all') {
            cleared += dashboardCache.keys().length;
            dashboardCache.flushAll();
        }

        if (type === 'heatmap' || type === 'all') {
            cleared += heatmapCache.keys().length;
            heatmapCache.flushAll();
        }

        res.json({
            message: 'Cache cleared successfully',
            clearedKeys: cleared
        });

    } catch (err) {
        res.status(500).json({ message: 'Error clearing cache', error: err.message });
    }
});

// BE-08: Cache Stats (Admin only)
router.get('/cache/stats', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Admin only' });
        }

        const stats = {
            dashboard: {
                keys: dashboardCache.keys().length,
                stats: dashboardCache.getStats()
            },
            heatmap: {
                keys: heatmapCache.keys().length,
                stats: heatmapCache.getStats()
            }
        };

        res.json(stats);

    } catch (err) {
        res.status(500).json({ message: 'Error getting stats', error: err.message });
    }
});

export default router;
