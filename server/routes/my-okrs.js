import express from 'express';
import Objective from '../models/Objective.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// List My OKRs: filter by ownerId (current user)
router.get('/', authMiddleware, async (req, res) => {
  const { quarter, year, type } = req.query;
  const filter = { ownerId: req.user.id };
  if (quarter) filter.quarter = quarter;
  if (year) filter.year = Number(year);
  if (type) filter.type = type;

  const okrs = await Objective.find(filter).sort({ createdAt: -1 });
  res.json(okrs);
});

function validateAndPrepareOKR(body) {
  if (!body || typeof body !== 'object') throw new Error('Missing body');
  const { title, keyResults, quarter, year, ownerId, ownerName, department, status, description, type, parentId, priority, tags, startDate, endDate, workgroupId } = body;

  if (!title || String(title).trim() === '') throw new Error('Missing title');
  if (!quarter) throw new Error('Missing quarter');
  if (!year || isNaN(Number(year))) throw new Error('Missing or invalid year');
  if (!Array.isArray(keyResults)) throw new Error('keyResults must be an array');
  if (keyResults.length === 0) throw new Error('At least one Key Result is required');

  const cleanedKRs = keyResults.map((kr, idx) => {
    const krTitle = kr.title || kr.name || '';
    const unit = kr.unit || '%';
    const targetValue = kr.targetValue != null ? Number(kr.targetValue) : 100;
    if (!krTitle || String(krTitle).trim() === '') throw new Error(`KR at index ${idx} is missing title`);

    return {
      title: String(krTitle).trim(),
      unit: String(unit).trim(),
      targetValue: targetValue,
      currentValue: Number(kr.currentValue || 0),
      source: kr.source || 'MANUAL',
      linkedId: kr.linkedId || null,
      confidenceScore: kr.confidenceScore != null ? Number(kr.confidenceScore) : 10,
      weight: Number(kr.weight || 1)
    };
  });

  return {
    title: String(title).trim(),
    description,
    type: type || 'PERSONAL',
    parentId: parentId || null,
    workgroupId: workgroupId || null,
    priority: priority || 'MEDIUM',
    tags: Array.isArray(tags) ? tags : [],
    quarter,
    year: Number(year),
    ownerId,
    ownerName,
    department,
    status: status || 'DRAFT',
    startDate,
    endDate,
    keyResults: cleanedKRs
  };
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const prepared = validateAndPrepareOKR(req.body);
    prepared.ownerId = req.user.id;
    prepared.ownerName = req.user.name || 'Unknown';
    const okr = await Objective.create(prepared);
    res.status(201).json(okr);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const okr = await Objective.findOne({ _id: req.params.id, ownerId: req.user.id });
    if (!okr) return res.status(404).json({ message: 'OKR not found or not owned by you' });

    const prepared = validateAndPrepareOKR(req.body);
    prepared.ownerId = req.user.id; // Keep ownership

    Object.assign(okr, prepared);
    await okr.save();
    res.json(okr);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const okr = await Objective.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!okr) return res.status(404).json({ message: 'OKR not found or not owned by you' });
    res.json({ message: 'OKR deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const okr = await Objective.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      { status },
      { new: true }
    );
    if (!okr) return res.status(404).json({ message: 'OKR not found or not owned by you' });
    res.json(okr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Key Results Management
router.post('/:okrId/keyresults', authMiddleware, async (req, res) => {
  try {
    const okr = await Objective.findOne({ _id: req.params.okrId, ownerId: req.user.id });
    if (!okr) return res.status(404).json({ message: 'OKR not found' });

    const { title, targetValue, unit, weight } = req.body;
    if (!title || !unit || targetValue == null) return res.status(400).json({ message: 'Missing fields' });

    okr.keyResults.push({
      title,
      targetValue: Number(targetValue),
      unit,
      currentValue: 0,
      weight: Number(weight || 1)
    });

    await okr.save();
    res.status(201).json(okr.keyResults[okr.keyResults.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:okrId/keyresults/:krId', authMiddleware, async (req, res) => {
  try {
    const okr = await Objective.findOne({ _id: req.params.okrId, ownerId: req.user.id });
    if (!okr) return res.status(404).json({ message: 'OKR not found' });

    const kr = okr.keyResults.id(req.params.krId);
    if (!kr) return res.status(404).json({ message: 'Key Result not found' });

    const { title, targetValue, unit, currentValue, weight } = req.body;
    if (title) kr.title = title;
    if (unit) kr.unit = unit;
    if (targetValue != null) kr.targetValue = Number(targetValue);
    if (currentValue != null) kr.currentValue = Number(currentValue);
    if (weight != null) kr.weight = Number(weight);

    await okr.save();
    res.json(kr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
