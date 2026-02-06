import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
  assigneeId: String,
  assigneeName: String,
  krId: String,
  krTitle: String,
  kpiId: { type: mongoose.Schema.Types.ObjectId, ref: 'KPI' },
  dueDate: String,
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' }
}, { timestamps: true });

export default mongoose.model('Task', TaskSchema);
