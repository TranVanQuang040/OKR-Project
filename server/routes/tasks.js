import express from 'express';
import Task from '../models/Task.js';
import Objective from '../models/Objective.js';
import MyObjective from '../models/MyObjective.js';
import authMiddleware from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

async function recalcKRProgress(krId) {
  try {
    if (!krId || !mongoose.Types.ObjectId.isValid(krId)) return;
    // Find objective that contains this KR in either Objective or MyObjective
    let obj = await Objective.findOne({ 'keyResults._id': krId });
    if (!obj) {
      obj = await MyObjective.findOne({ 'keyResults._id': krId });
    }
    if (!obj) return;
    const kr = obj.keyResults.id(krId);
    if (!kr) return;
    // Count tasks for this KR
    const TaskModel = Task;
    const tasks = await TaskModel.find({ krId: krId });
    const done = tasks.filter(t => t.status === 'DONE').length;
    kr.progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : kr.progress;
    // Recompute objective progress as average
    if (obj.keyResults.length > 0) {
      obj.progress = Math.round(obj.keyResults.reduce((acc, k) => acc + (k.progress || 0), 0) / obj.keyResults.length);
    } else {
      obj.progress = 0;
    }
    await obj.save();
  } catch (err) {
    console.error('Error in recalcKRProgress:', err);
  }
}

// GET with optional query params: assigneeId, krId, status
router.get('/', authMiddleware, async (req, res) => {
  const { assigneeId, krId, status } = req.query;
  const filter = {};
  if (assigneeId) filter.assigneeId = assigneeId;
  if (krId) filter.krId = krId;
  if (status) filter.status = status;
  const tasks = await Task.find(filter);
  res.json(tasks);
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    // recalc if krId present
    if (task.krId) await recalcKRProgress(task.krId);
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data', error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Not found' });
  res.json(task);
});

router.put('/:id', authMiddleware, async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!task) return res.status(404).json({ message: 'Not found' });
  if (task.krId) await recalcKRProgress(task.krId);
  res.json(task);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: 'Not found' });
  if (task.krId) await recalcKRProgress(task.krId);
  res.json({ message: 'Deleted' });
});

// Patch status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Not found' });
  task.status = status;
  await task.save();
  if (task.krId) await recalcKRProgress(task.krId);
  res.json(task);
});

// Assign task to a user
router.patch('/:id/assign', authMiddleware, async (req, res) => {
  const { assigneeId, assigneeName } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Not found' });
  task.assigneeId = assigneeId;
  task.assigneeName = assigneeName;
  await task.save();
  res.json(task);
});

export default router;