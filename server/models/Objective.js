import mongoose from 'mongoose';

const KeyResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  currentValue: { type: Number, default: 0 },
  targetValue: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  weight: { type: Number, default: 1, min: 1, max: 10 },
  progress: { type: Number, default: 0 },
  source: { type: String, enum: ['MANUAL', 'KPI', 'TASK'], default: 'MANUAL' },
  linkedId: { type: String }, // Can be KPI ID or Task ID depending on source
  confidenceScore: { type: Number, default: 10, min: 1, max: 10 }
});

const ObjectiveSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['COMPANY', 'DEPARTMENT', 'PERSONAL'], default: 'DEPARTMENT' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null },
  priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  tags: [String],
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
