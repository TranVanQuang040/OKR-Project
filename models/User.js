import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' },
  department: { type: String },
  position: { type: String }, // Chức vụ
  avatar: { type: String },
  supervisorId: { type: String }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
