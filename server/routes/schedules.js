import express from 'express';
import WorkSchedule from '../models/WorkSchedule.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to get date key
function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Register or update schedule (Bulk)
router.post('/bulk', authMiddleware, async (req, res) => {
    try {
        const { schedules } = req.body; // Array of { dateKey, shift, note }
        if (!Array.isArray(schedules)) {
            return res.status(400).json({ message: 'Schedules must be an array' });
        }

        const results = [];
        for (const item of schedules) {
            const { dateKey, shift, note, userId: targetUserId } = item;
            let finalUserId = req.user.id;
            let finalUserName = req.user.name;
            let finalDept = req.user.department || '';

            // If admin/manager is updating for someone else
            if (targetUserId && targetUserId !== req.user.id && ['ADMIN', 'MANAGER'].includes(req.user.role)) {
                finalUserId = targetUserId;
                const targetUser = await User.findById(targetUserId);
                if (targetUser) {
                    finalUserName = targetUser.name;
                    finalDept = targetUser.department || '';
                }
            }

            const updated = await WorkSchedule.findOneAndUpdate(
                { userId: finalUserId, dateKey },
                {
                    userId: finalUserId,
                    userName: finalUserName,
                    department: finalDept,
                    dateKey,
                    shift: shift || 'FULL_DAY',
                    status: 'APPROVED',
                    note: note || ''
                },
                { upsert: true, new: true }
            );
            results.push(updated);
        }

        res.json(results);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update schedules', error: err.message });
    }
});

// Get my own schedules
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { from, to } = req.query;
        const filter = { userId: req.user.id };

        if (from || to) {
            filter.dateKey = {};
            if (from) filter.dateKey.$gte = String(from);
            if (to) filter.dateKey.$lte = String(to);
        }

        const records = await WorkSchedule.find(filter).sort({ dateKey: 1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch schedules', error: err.message });
    }
});

// Admin/Manager: Get everyone's schedules
router.get('/', authMiddleware, async (req, res) => {
    try {
        if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { from, to, department, userId } = req.query;
        const filter = {};

        if (from || to) {
            filter.dateKey = {};
            if (from) filter.dateKey.$gte = String(from);
            if (to) filter.dateKey.$lte = String(to);
        }

        if (req.user.role === 'MANAGER') {
            filter.department = req.user.department;
        } else if (department) {
            filter.department = String(department);
        }

        if (userId) {
            filter.userId = userId;
        }

        const records = await WorkSchedule.find(filter).sort({ dateKey: 1, userName: 1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch schedules', error: err.message });
    }
});

// Admin/Manager: Summary report (Absence tracking)
router.get('/report', authMiddleware, async (req, res) => {
    try {
        if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const from = req.query.from || getDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        const to = req.query.to || getDateKey(new Date());

        const match = {
            dateKey: { $gte: from, $lte: to }
        };

        if (req.user.role === 'MANAGER') {
            match.department = req.user.department;
        } else if (req.query.department) {
            match.department = String(req.query.department);
        }

        const schedules = await WorkSchedule.find(match);

        // Group by user
        const userStats = {};
        schedules.forEach(s => {
            if (!userStats[s.userId]) {
                userStats[s.userId] = {
                    userId: s.userId,
                    userName: s.userName,
                    department: s.department,
                    plannedDays: 0,
                    offDays: 0,
                    workDays: 0,
                    unexcusedAbsences: 0
                };
            }
            userStats[s.userId].plannedDays++;
            if (s.shift === 'OFF') {
                userStats[s.userId].offDays++;
            } else if (s.shift === 'UNEXCUSED_ABSENCE') {
                userStats[s.userId].unexcusedAbsences++;
            } else {
                userStats[s.userId].workDays++;
            }
        });

        res.json(Object.values(userStats));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch report', error: err.message });
    }
});

export default router;
