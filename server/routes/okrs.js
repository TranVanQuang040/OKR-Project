import express from 'express';
import Objective from '../models/Objective.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// List with optional filters: quarter, year, department
router.get('/', authMiddleware, async (req, res) => {
  const { quarter, year, department } = req.query;
  const filter = {};
  if (quarter) filter.quarter = quarter;
  if (year) filter.year = Number(year);
  if (department) filter.department = department;
  const okrs = await Objective.find(filter);
  res.json(okrs);
});

function validateAndPrepareOKR(body) {
  if (!body || typeof body !== 'object') throw new Error('Missing body');
  const { title, keyResults, quarter, year, ownerId, ownerName, department, status } = body;
  if (!title || String(title).trim() === '') throw new Error('Missing title');
  if (!quarter) throw new Error('Missing quarter');
  if (!year || isNaN(Number(year))) throw new Error('Missing or invalid year');
  if (!Array.isArray(keyResults)) throw new Error('keyResults must be an array');
  if (keyResults.length === 0) throw new Error('At least one Key Result is required');

  const cleanedKRs = keyResults.map((kr, idx) => {
    const title = kr.title || kr.name || '';
    const unit = kr.unit || '';
    const targetValue = kr.targetValue != null ? Number(kr.targetValue) : (kr.target != null ? Number(kr.target) : null);
    if (!title || String(title).trim() === '') throw new Error(`KR at index ${idx} is missing title`);
    if (!unit || String(unit).trim() === '') throw new Error(`KR at index ${idx} is missing unit`);
    if (targetValue == null || isNaN(targetValue) || targetValue <= 0) throw new Error(`KR at index ${idx} has invalid targetValue`);
    return {
      title: String(title).trim(),
      unit: String(unit).trim(),
      targetValue: targetValue,
      currentValue: Number(kr.currentValue || 0),
      progress: Number(kr.progress || 0)
    };
  });

  return {
    title: String(title).trim(),
    quarter, year: Number(year), ownerId, ownerName, department, status: status || 'DRAFT',
    keyResults: cleanedKRs
  };
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const payload = validateAndPrepareOKR(req.body);
    const okr = await Objective.create(payload);
    res.json(okr);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data', error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const okr = await Objective.findById(req.params.id);
  if (!okr) return res.status(404).json({ message: 'Not found' });
  res.json(okr);
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const okr = await Objective.findById(req.params.id);
    if (!okr) return res.status(404).json({ message: 'Not found' });

    const payload = validateAndPrepareOKR({ ...okr.toObject(), ...req.body });

    // apply fields
    okr.title = payload.title;
    okr.quarter = payload.quarter;
    okr.year = payload.year;
    okr.ownerId = payload.ownerId || okr.ownerId;
    okr.ownerName = payload.ownerName || okr.ownerName;
    okr.department = payload.department || okr.department;
    if (req.body.status) okr.status = req.body.status;
    okr.keyResults = payload.keyResults;

    await okr.save();
    res.json(okr);
  } catch (err) {
    res.status(400).json({ message: 'Invalid data', error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  await Objective.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Update status (approve/reject/other)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Missing status' });
  const okr = await Objective.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!okr) return res.status(404).json({ message: 'Not found' });
  res.json(okr);
});

// Key Results CRUD
router.post('/:id/keyresults', authMiddleware, async (req, res) => {
  const { title, targetValue, unit } = req.body;
  if (!title || targetValue == null || !unit) return res.status(400).json({ message: 'Missing fields' });
  const okr = await Objective.findById(req.params.id);
  if (!okr) return res.status(404).json({ message: 'Not found' });
  const kr = { title, targetValue, unit, currentValue: 0, progress: 0 };
  okr.keyResults.push(kr);
  await okr.save();
  res.json(okr);
});

router.put('/:id/keyresults/:krId', authMiddleware, async (req, res) => {
  const { title, targetValue, unit, currentValue } = req.body;
  const okr = await Objective.findById(req.params.id);
  if (!okr) return res.status(404).json({ message: 'Not found' });
  const kr = okr.keyResults.id(req.params.krId);
  if (!kr) return res.status(404).json({ message: 'KR not found' });
  if (title) kr.title = title;
  if (targetValue != null) kr.targetValue = targetValue;
  if (unit) kr.unit = unit;
  if (currentValue != null) kr.currentValue = currentValue;
  await okr.save();
  res.json(okr);
});

router.delete('/:id/keyresults/:krId', authMiddleware, async (req, res) => {
  const okr = await Objective.findById(req.params.id);
  if (!okr) return res.status(404).json({ message: 'Not found' });
  okr.keyResults.id(req.params.krId).remove();
  await okr.save();
  res.json(okr);
});

export default router;
