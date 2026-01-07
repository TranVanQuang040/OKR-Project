import mongoose from 'mongoose';

const KeyResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  currentValue: { type: Number, default: 0 },
  targetValue: { type: Number, required: true },
  unit: { type: String, required: true },
  progress: { type: Number, default: 0 }
});

const ObjectiveSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  ownerId: String,
  ownerName: String,
  department: String,
  quarter: String,
  year: Number,
  status: { type: String, default: 'DRAFT' },
  progress: { type: Number, default: 0 },
  keyResults: [KeyResultSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Objective', ObjectiveSchema);
