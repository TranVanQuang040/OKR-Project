import express from 'express';
import mongoose from 'mongoose';
import KPI from '../models/KPI.js';
import Objective from '../models/Objective.js';
import MyObjective from '../models/MyObjective.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get all KPIs with filters
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, department, quarter, year, userId } = req.query;
        const filter = {};

        if (type) filter.type = type;
        if (department) filter.department = department;
        if (quarter) filter.quarter = quarter;
        if (year) filter.year = Number(year);
        if (userId) filter.assignedTo = userId;

        // Non-admin users can only see their department's KPIs
        if (req.user.role !== 'ADMIN') {
            filter.department = req.user.department;
        }

        const kpis = await KPI.find(filter).sort({ createdAt: -1 });
        console.log(`GET /api/kpis result: ${kpis.length} items`);
        res.json(kpis);

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get department KPIs
router.get('/department/:dept', authMiddleware, async (req, res) => {
    try {
        const kpis = await KPI.find({
            type: 'DEPARTMENT',
            department: req.params.dept
        }).sort({ createdAt: -1 });
        res.json(kpis);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get personal KPIs for a user
router.get('/personal/:userId', authMiddleware, async (req, res) => {
    try {
        // Users can only see their own KPIs unless they're manager/admin
        if (req.user.role === 'EMPLOYEE' && req.user.id !== req.params.userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const kpis = await KPI.find({
            type: 'PERSONAL',
            assignedTo: req.params.userId
        }).sort({ createdAt: -1 });
        res.json(kpis);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new KPI
router.post('/', authMiddleware, async (req, res) => {
    console.log('POST /api/kpis payload:', req.body);
    try {

        const { type, assignedTo } = req.body;

        // Only managers and admins can create personal KPIs
        if (type === 'PERSONAL' && req.user.role === 'EMPLOYEE') {
            return res.status(403).json({ message: 'Only managers can assign personal KPIs' });
        }

        // Set assignedBy for personal KPIs
        if (type === 'PERSONAL') {
            req.body.assignedBy = req.user.id;
            req.body.assignedByName = req.user.name;

            // Get assignedToDepartment and department from the user being assigned
            if (assignedTo) {
                const assignedUser = await User.findById(assignedTo);
                if (assignedUser) {
                    req.body.assignedToDepartment = assignedUser.department;
                    req.body.department = assignedUser.department;
                }
            }
        }

        if (req.body.linkedOKRId && mongoose.Types.ObjectId.isValid(req.body.linkedOKRId)) {
            let okr = await Objective.findById(req.body.linkedOKRId);
            if (!okr) okr = await MyObjective.findById(req.body.linkedOKRId);

            if (okr) {
                req.body.linkedOKRTitle = okr.title;
                if (req.body.linkedKRId) {
                    const kr = okr.keyResults?.id ? okr.keyResults.id(req.body.linkedKRId) : okr.keyResults?.find(k => k._id.toString() === req.body.linkedKRId || k.id === req.body.linkedKRId);
                    if (kr) req.body.linkedKRTitle = kr.title;
                }
            }
        } else {
            req.body.linkedOKRId = null;
            req.body.linkedOKRTitle = '';
            req.body.linkedKRId = null;
            req.body.linkedKRTitle = '';
        }

        const kpi = await KPI.create(req.body);
        res.json(kpi);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Get single KPI
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI không tìm thấy' });
        res.json(kpi);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update KPI
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI không tìm thấy' });

        // Check permissions for personal KPI
        if (kpi.type === 'PERSONAL' && req.user.role === 'EMPLOYEE') {
            if (kpi.assignedBy !== req.user.id && kpi.assignedTo !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }

        // Validate linked OKR if provided
        if (req.body.linkedOKRId && mongoose.Types.ObjectId.isValid(req.body.linkedOKRId)) {
            let okr = await Objective.findById(req.body.linkedOKRId);
            if (!okr) okr = await MyObjective.findById(req.body.linkedOKRId);

            if (okr) {
                req.body.linkedOKRTitle = okr.title;
                if (req.body.linkedKRId) {
                    const kr = okr.keyResults?.id ? okr.keyResults.id(req.body.linkedKRId) : okr.keyResults?.find(k => k._id.toString() === req.body.linkedKRId || k.id === req.body.linkedKRId);
                    if (kr) req.body.linkedKRTitle = kr.title;
                } else {
                    req.body.linkedKRId = null;
                    req.body.linkedKRTitle = '';
                }
            }
        } else if (req.body.linkedOKRId === '' || req.body.linkedOKRId === null || req.body.linkedOKRId === undefined) {
            req.body.linkedOKRId = null;
            req.body.linkedOKRTitle = '';
            req.body.linkedKRId = null;
            req.body.linkedKRTitle = '';
        }

        // Update assignedToDepartment if assignedTo is being changed
        if (req.body.assignedTo && req.body.assignedTo !== kpi.assignedTo) {
            const assignedUser = await User.findById(req.body.assignedTo);
            if (assignedUser) {
                req.body.assignedToDepartment = assignedUser.department;
                req.body.department = assignedUser.department;
            }
        }

        // Clean payload before assign to avoid overwriting sanitized null with empty string
        const payload = { ...req.body };
        if (payload.linkedOKRId === '') payload.linkedOKRId = null;

        Object.assign(kpi, payload);
        await kpi.save();

        res.json(kpi);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Update KPI progress (and auto-update linked OKR)
router.patch('/:id/progress', authMiddleware, async (req, res) => {
    try {
        const { currentValue } = req.body;
        if (currentValue == null) {
            return res.status(400).json({ message: 'currentValue is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI không tìm thấy' });

        kpi.currentValue = Number(currentValue);
        await kpi.save();

        // Auto-update linked OKR if exists
        if (kpi.linkedOKRId) {
            try {
                // Try Objective (Dept OKR) first
                let okr = await Objective.findById(kpi.linkedOKRId);
                let isPersonal = false;
                if (!okr) {
                    okr = await MyObjective.findById(kpi.linkedOKRId);
                    isPersonal = true;
                }

                if (okr) {
                    if (kpi.linkedKRId) {
                        // Find all KPIs linked to this specific Key Result
                        const linkedKPIs = await KPI.find({ linkedKRId: kpi.linkedKRId });
                        const totalProgress = linkedKPIs.reduce((sum, k) => sum + (k.progress || 0), 0);
                        const avgProgress = linkedKPIs.length > 0
                            ? Math.round(totalProgress / linkedKPIs.length)
                            : 0;

                        // Find and update the specific Key Result
                        const kr = okr.keyResults.id ? okr.keyResults.id(kpi.linkedKRId) : okr.keyResults.find(k => k._id.toString() === kpi.linkedKRId || k.id === kpi.linkedKRId);
                        if (kr) {
                            kr.progress = avgProgress;
                            // Also update currentValue as a percentage of targetValue
                            kr.currentValue = Math.round((avgProgress / 100) * kr.targetValue);
                        }
                    }

                    // Recalculate overall OKR progress based on its Key Results
                    if (okr.keyResults && okr.keyResults.length > 0) {
                        const totalKRProgress = okr.keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
                        okr.progress = Math.round(totalKRProgress / okr.keyResults.length);
                    } else {
                        // Fallback to average of all KPIs linked to this OKR if no KRs
                        const allLinkedKPIs = await KPI.find({ linkedOKRId: kpi.linkedOKRId });
                        const totalKpiProgress = allLinkedKPIs.reduce((sum, k) => sum + (k.progress || 0), 0);
                        okr.progress = allLinkedKPIs.length > 0 ? Math.round(totalKpiProgress / allLinkedKPIs.length) : 0;
                    }

                    await okr.save();
                }
            } catch (okrErr) {
                console.error('Error updating linked OKR/KR:', okrErr);
            }
        }

        res.json(kpi);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Delete KPI
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI không tìm thấy' });

        // Only creator or admin can delete
        if (req.user.role === 'EMPLOYEE' && kpi.assignedBy !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await KPI.findByIdAndDelete(req.params.id);
        res.json({ message: 'KPI deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Catch-all for KPI router to debug 404
router.use((req, res) => {
    console.log(`--- KPI Router 404 Fallback: ${req.method} ${req.originalUrl} ---`);
    res.status(404).json({ message: `KPI Route not found: ${req.method} ${req.originalUrl}` });
});

export default router;
