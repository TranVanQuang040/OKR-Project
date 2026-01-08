import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Department from '../models/Department.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// List users (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    // Convert department ID to name if needed
    const usersWithDeptNames = await Promise.all(users.map(async (user) => {
      const userObj = user.toObject();
      if (userObj.department && userObj.department.match(/^[0-9a-fA-F]{24}$/)) {
        const dept = await Department.findById(userObj.department);
        userObj.department = dept ? dept.name : userObj.department;
      }
      return userObj;
    }));
    res.json(usersWithDeptNames);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Helper to generate default avatar URL
function generateAvatar(seed) {
  const safe = encodeURIComponent(String(seed || 'user'));
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${safe}`;
}

// Create user (admin only)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const { name, email, password, role, department, avatar } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    
    // Validate department - đảm bảo là tên phòng ban, không phải ID
    let finalDepartment = department;
    if (department && department.match(/^[0-9a-fA-F]{24}$/)) { // Nếu là ObjectId
      const dept = await Department.findById(department);
      finalDepartment = dept ? dept.name : department;
    }
    
    const hash = await bcrypt.hash(password, 10);
    const finalAvatar = avatar || generateAvatar(name || email);
    const user = await User.create({ name, email, password: hash, role, department: finalDepartment, avatar: finalAvatar });
    const u = user.toObject(); delete u.password;
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update avatar (self or admin)
router.patch('/:id/avatar', authMiddleware, async (req, res) => {
  const { avatar } = req.body;
  if (!avatar) return res.status(400).json({ message: 'Missing avatar' });
  if (req.user.role !== 'ADMIN' && req.user._id.toString() !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { avatar }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Not found' });
    
    const userObj = user.toObject();
    // Convert department ID to name if needed
    if (userObj.department && userObj.department.match(/^[0-9a-fA-F]{24}$/)) {
      const dept = await Department.findById(userObj.department);
      userObj.department = dept ? dept.name : userObj.department;
    }
    
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  // Only ADMIN or the user themselves can update
  if (req.user.role !== 'ADMIN' && req.user._id.toString() !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
  const updates = { ...req.body };
  if (updates.password) delete updates.password; // password changes via dedicated endpoint
  
  // Validate department - đảm bảo là tên phòng ban, không phải ID
  if (updates.department && updates.department.match(/^[0-9a-fA-F]{24}$/)) { // Nếu là ObjectId
    const dept = await Department.findById(updates.department);
    updates.department = dept ? dept.name : updates.department;
  }
  
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'Not found' });
  
  const userObj = user.toObject();
  // Convert department ID to name if needed
  if (userObj.department && userObj.department.match(/^[0-9a-fA-F]{24}$/)) {
    const dept = await Department.findById(userObj.department);
    userObj.department = dept ? dept.name : userObj.department;
  }
  
  res.json(userObj);
});

// Change password
router.post('/:id/password', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Missing password' });
  // Only ADMIN or the user themselves can change password
  if (req.user.role !== 'ADMIN' && req.user._id.toString() !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password: hash }, { new: true }).select('-password');
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  // Only ADMIN can delete users
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

export default router;
