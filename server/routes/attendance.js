import express from 'express';
import Attendance from '../models/Attendance.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calcLateMinutes(checkInAt) {
  const startHour = Number(process.env.ATTENDANCE_START_HOUR || 9);
  const startMinute = Number(process.env.ATTENDANCE_START_MINUTE || 0);
  const officeStart = new Date(checkInAt);
  officeStart.setHours(startHour, startMinute, 0, 0);
  const diffMs = checkInAt.getTime() - officeStart.getTime();
  return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
}

router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const dateKey = getDateKey(now);
    const existing = await Attendance.findOne({ userId: req.user.id, dateKey });

    if (existing) {
      return res.status(409).json({ message: 'You have already checked in today', attendance: existing });
    }

    const lateMinutes = calcLateMinutes(now);
    const localIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || '';
    const clientIp = req.body?.publicIp || localIp;
    const ua = req.headers['user-agent'] || '';
    const attendance = await Attendance.create({
      userId: req.user.id,
      userName: req.user.name,
      department: req.user.department || '',
      dateKey,
      checkInAt: now,
      status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
      lateMinutes,
      note: req.body?.note || '',
      ipAddress: clientIp,
      userAgent: ua,
      networkInfo: {
        type: req.body?.networkInfo?.type || '',
        wifiName: req.body?.networkInfo?.wifiName || '',
        effectiveType: req.body?.networkInfo?.effectiveType || ''
      }
    });

    res.json(attendance);
  } catch (err) {
    res.status(400).json({ message: 'Check-in failed', error: err.message });
  }
});

router.post('/check-out', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const dateKey = getDateKey(now);
    const attendance = await Attendance.findOne({ userId: req.user.id, dateKey });

    if (!attendance) {
      return res.status(404).json({ message: 'No check-in found for today' });
    }
    if (attendance.checkOutAt) {
      return res.status(409).json({ message: 'You have already checked out today', attendance });
    }

    attendance.checkOutAt = now;
    if (req.body?.note) attendance.note = req.body.note;

    // Calculate work minutes (pre-save hook will also do this, but we need it for status)
    const diffMs = attendance.checkOutAt.getTime() - attendance.checkInAt.getTime();
    const workMins = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    attendance.totalWorkMinutes = workMins;

    // Logic: If work < 4 hours (240 mins), it's a HALF_DAY
    if (workMins > 0 && workMins < 240) {
      attendance.status = 'HALF_DAY';
    }

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    res.status(400).json({ message: 'Check-out failed', error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { userId: req.user.id };

    if (from || to) {
      filter.dateKey = {};
      if (from) filter.dateKey.$gte = String(from);
      if (to) filter.dateKey.$lte = String(to);
    }

    const records = await Attendance.find(filter).sort({ dateKey: -1, checkInAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
});

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const dateKey = req.query.dateKey ? String(req.query.dateKey) : getDateKey(new Date());
    const filter = { dateKey };

    if (req.user.role === 'EMPLOYEE') {
      filter.userId = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      filter.department = req.user.department;
    } else if (req.query.department) {
      filter.department = String(req.query.department);
    }

    const records = await Attendance.find(filter).sort({ checkInAt: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch today attendance', error: err.message });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const from = req.query.from ? String(req.query.from) : getDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const to = req.query.to ? String(req.query.to) : getDateKey(new Date());

    const match = {
      dateKey: { $gte: from, $lte: to }
    };

    if (req.user.role === 'MANAGER') {
      match.department = req.user.department;
    } else if (req.query.department) {
      match.department = String(req.query.department);
    }

    const result = await Attendance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$userId',
          userName: { $last: '$userName' },
          department: { $last: '$department' },
          presentDays: { $sum: 1 },
          lateDays: {
            $sum: {
              $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0]
            }
          },
          totalWorkMinutes: { $sum: '$totalWorkMinutes' }
        }
      },
      { $sort: { userName: 1 } }
    ]);

    res.json({
      from,
      to,
      summary: result.map(item => ({
        userId: item._id,
        userName: item.userName,
        department: item.department,
        presentDays: item.presentDays,
        lateDays: item.lateDays,
        totalWorkMinutes: item.totalWorkMinutes
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

router.get('/status', authMiddleware, async (req, res) => {
  try {
    const dateKey = getDateKey(new Date());
    const attendance = await Attendance.findOne({ userId: req.user.id, dateKey });

    if (!attendance) {
      return res.json({ dateKey, checkedIn: false, checkedOut: false });
    }

    res.json({
      dateKey,
      checkedIn: true,
      checkedOut: Boolean(attendance.checkOutAt),
      attendance
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status', error: err.message });
  }
});

// Admin/Manager update record
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'MANAGER'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { status, note, checkInAt, checkOutAt } = req.body;
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (status) attendance.status = status;
    if (note) attendance.note = note;
    if (checkInAt) attendance.checkInAt = new Date(checkInAt);
    if (checkOutAt) attendance.checkOutAt = new Date(checkOutAt);

    await attendance.save();
    res.json(attendance);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
});

export default router;
