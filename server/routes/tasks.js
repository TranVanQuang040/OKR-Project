import express from 'express';
import Task from '../models/Task.js';
import Objective from '../models/Objective.js';
import MyObjective from '../models/MyObjective.js';
import KPI from '../models/KPI.js';
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
    // Recompute objective progress as weighted average
    if (obj.keyResults.length > 0) {
      const totalWeight = obj.keyResults.reduce((acc, k) => acc + (k.weight || 1), 0);
      const weightedSum = obj.keyResults.reduce((acc, k) => acc + ((k.progress || 0) * (k.weight || 1)), 0);
      obj.progress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    } else {
      obj.progress = 0;
    }
    await obj.save();
  } catch (err) {
    console.error('Error in recalcKRProgress:', err);
  }
}

async function syncLinkedKPIs(taskId) {
  try {
    const task = await Task.findById(taskId);
    if (!task) return;

    // 1. Handle legacy link (KPI.linkedTaskId)
    const legacyKPIs = await KPI.find({ linkedTaskId: taskId });
    for (const kpi of legacyKPIs) {
      let progress = 0;
      if (task.status === 'DONE') progress = 100;
      else if (task.status === 'IN_PROGRESS') progress = 50;
      kpi.progress = progress;
      kpi.currentValue = Math.round((progress / 100) * (kpi.targetValue || 100));
      await kpi.save();
    }

    // 2. Handle new 1-N link (Task.kpiId)
    if (task.kpiId) {
      const kpi = await KPI.findById(task.kpiId);
      if (kpi) {
        const tasksForKpi = await Task.find({ kpiId: task.kpiId });
        const total = tasksForKpi.length;
        if (total > 0) {
          const progressSum = tasksForKpi.reduce((acc, t) => {
            if (t.status === 'DONE') return acc + 100;
            if (t.status === 'IN_PROGRESS') return acc + 50;
            return acc;
          }, 0);
          const avg = Math.round(progressSum / total);
          kpi.progress = avg;
          kpi.currentValue = Math.round((avg / 100) * (kpi.targetValue || 100));
          await kpi.save();
        }
      }
    }
  } catch (err) {
    console.error('Error in syncLinkedKPIs:', err);
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
    if (task.id) await syncLinkedKPIs(task.id);
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
  await syncLinkedKPIs(task.id);
  res.json(task);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: 'Not found' });
  if (task.krId) await recalcKRProgress(task.krId);
  // If task is deleted, maybe set linked KPI progress to 0 or leave as is? 
  // For safety, let's sync if there are still KPIs.
  await syncLinkedKPIs(req.params.id);
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
  await syncLinkedKPIs(task.id);
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