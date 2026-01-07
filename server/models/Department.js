import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  head: { type: String }, // user id or name
  description: { type: String },
  createdBy: { type: String },
}, { timestamps: true });

export default mongoose.model('Department', DepartmentSchema);
