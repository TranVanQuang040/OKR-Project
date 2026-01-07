import express from 'express';
import KPI from '../models/KPI.js';
import Objective from '../models/Objective.js';
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
        }

        // Validate linked OKR if provided
        if (req.body.linkedOKRId) {
            const okr = await Objective.findById(req.body.linkedOKRId);
            if (okr) {
                req.body.linkedOKRTitle = okr.title;
            }
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
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI not found' });
        res.json(kpi);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update KPI
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI not found' });

        // Check permissions for personal KPI
        if (kpi.type === 'PERSONAL' && req.user.role === 'EMPLOYEE') {
            if (kpi.assignedBy !== req.user.id && kpi.assignedTo !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }

        Object.assign(kpi, req.body);
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

        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI not found' });

        kpi.currentValue = Number(currentValue);
        await kpi.save();

        // Auto-update linked OKR if exists
        if (kpi.linkedOKRId) {
            try {
                const okr = await Objective.findById(kpi.linkedOKRId);
                if (okr) {
                    // Find all KPIs linked to this OKR
                    const linkedKPIs = await KPI.find({ linkedOKRId: kpi.linkedOKRId });

                    // Calculate average progress of all linked KPIs
                    const totalProgress = linkedKPIs.reduce((sum, k) => sum + k.progress, 0);
                    const avgProgress = linkedKPIs.length > 0
                        ? Math.round(totalProgress / linkedKPIs.length)
                        : 0;

                    okr.progress = avgProgress;

                    // Also update key results if they exist
                    if (okr.keyResults && okr.keyResults.length > 0) {
                        const krProgress = okr.keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
                        const krAvg = Math.round(krProgress / okr.keyResults.length);

                        // Use the higher of KPI progress or KR progress
                        okr.progress = Math.max(avgProgress, krAvg);
                    }

                    await okr.save();
                }
            } catch (okrErr) {
                console.error('Error updating linked OKR:', okrErr);
                // Don't fail the KPI update if OKR update fails
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
        const kpi = await KPI.findById(req.params.id);
        if (!kpi) return res.status(404).json({ message: 'KPI not found' });

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

export default router;
