import express from 'express';
import Workgroup from '../models/Workgroup.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get all workgroups
router.get('/', authMiddleware, async (req, res) => {
    try {
        const workgroups = await Workgroup.find()
            .populate('leaderId', 'name role department')
            .populate('members', 'name role department');
        res.json(workgroups);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a workgroup
router.post('/', authMiddleware, async (req, res) => {
    try {
        const workgroup = new Workgroup(req.body);
        const savedWorkgroup = await workgroup.save();
        const populatedWorkgroup = await Workgroup.findById(savedWorkgroup._id)
            .populate('leaderId', 'name role department')
            .populate('members', 'name role department');
        res.status(201).json(populatedWorkgroup);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a workgroup
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const updatedWorkgroup = await Workgroup.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('leaderId', 'name role department')
            .populate('members', 'name role department');
        res.json(updatedWorkgroup);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a workgroup
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await Workgroup.findByIdAndDelete(req.params.id);
        res.json({ message: 'Workgroup deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
