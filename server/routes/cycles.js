import express from 'express';
import Cycle from '../models/Cycle.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get all cycles
router.get('/', authMiddleware, async (req, res) => {
    try {
        const cycles = await Cycle.find({}).sort({ year: -1, quarter: -1 });
        res.json(cycles);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get current active cycle
router.get('/current', authMiddleware, async (req, res) => {
    try {
        const activeCycle = await Cycle.findOne({ status: 'ACTIVE' });
        if (!activeCycle) {
            return res.status(404).json({ message: 'No active cycle found' });
        }
        res.json(activeCycle);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get single cycle
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const cycle = await Cycle.findById(req.params.id);
        if (!cycle) {
            return res.status(404).json({ message: 'Cycle not found' });
        }
        res.json(cycle);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create new cycle
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, quarter, year, startDate, endDate } = req.body;

        if (!name || !quarter || !year || !startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if cycle already exists
        const existing = await Cycle.findOne({ quarter, year });
        if (existing) {
            return res.status(400).json({ message: 'Cycle already exists for this quarter/year' });
        }

        const cycle = await Cycle.create({
            name,
            quarter,
            year: Number(year),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: 'PLANNING',
            createdBy: req.user.id,
            createdByName: req.user.name
        });

        res.json(cycle);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Update cycle
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const cycle = await Cycle.findById(req.params.id);
        if (!cycle) {
            return res.status(404).json({ message: 'Cycle not found' });
        }

        const { name, quarter, year, startDate, endDate, status } = req.body;

        if (name) cycle.name = name;
        if (quarter) cycle.quarter = quarter;
        if (year) cycle.year = Number(year);
        if (startDate) cycle.startDate = new Date(startDate);
        if (endDate) cycle.endDate = new Date(endDate);
        if (status) cycle.status = status;

        await cycle.save();
        res.json(cycle);
    } catch (err) {
        res.status(400).json({ message: 'Invalid data', error: err.message });
    }
});

// Activate cycle (set status to ACTIVE, close others)
router.patch('/:id/activate', authMiddleware, async (req, res) => {
    try {
        // Set all other cycles to CLOSED
        await Cycle.updateMany(
            { _id: { $ne: req.params.id }, status: 'ACTIVE' },
            { status: 'CLOSED' }
        );

        // Set this cycle to ACTIVE
        const cycle = await Cycle.findByIdAndUpdate(
            req.params.id,
            { status: 'ACTIVE' },
            { new: true }
        );

        if (!cycle) {
            return res.status(404).json({ message: 'Cycle not found' });
        }

        res.json(cycle);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete cycle
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const cycle = await Cycle.findByIdAndDelete(req.params.id);
        if (!cycle) {
            return res.status(404).json({ message: 'Cycle not found' });
        }
        res.json({ message: 'Cycle deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

export default router;
