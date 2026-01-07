import express from 'express';
import Objective from '../models/Objective.js';
import Task from '../models/Task.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Summary report: total OKRs, avg progress, OKRs by department, task statuses
router.get('/summary', authMiddleware, async (req, res) => {
  const { quarter, year } = req.query;
  const filter = {};
  if (quarter) filter.quarter = quarter;
  if (year) filter.year = Number(year);

  const okrs = await Objective.find(filter);
  const tasks = await Task.find();

  const totalOkrs = okrs.length;
  const avgProgress = totalOkrs ? Math.round(okrs.reduce((acc, o) => acc + o.progress, 0) / totalOkrs) : 0;

  const okrsByDept = {};
  okrs.forEach(o => {
    if (!okrsByDept[o.department]) okrsByDept[o.department] = { count: 0, progressSum: 0 };
    okrsByDept[o.department].count += 1;
    okrsByDept[o.department].progressSum += o.progress || 0;
  });
  const okrsByDepartment = Object.entries(okrsByDept).map(([department, v]) => ({ department, count: v.count, avgProgress: Math.round(v.progressSum / v.count) }));

  const taskStatusCounts = {
    TODO: tasks.filter(t => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    DONE: tasks.filter(t => t.status === 'DONE').length
  };

  res.json({ totalOkrs, avgProgress, okrsByDepartment, taskStatusCounts });
});

export default router;