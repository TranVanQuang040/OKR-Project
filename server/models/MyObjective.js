import mongoose from 'mongoose';

const keyResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  targetValue: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  currentValue: { type: Number, default: 0 },
  weight: { type: Number, default: 1, min: 1, max: 10 },
  progress: { type: Number, default: 0 },
  source: { type: String, enum: ['MANUAL', 'KPI', 'TASK'], default: 'MANUAL' },
  linkedId: { type: String },
  confidenceScore: { type: Number, default: 10, min: 1, max: 10 }
});

const myObjectiveSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['COMPANY', 'DEPARTMENT', 'PERSONAL'], default: 'PERSONAL' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null },
  priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  tags: [String],
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  department: { type: String },
  quarter: { type: String, required: true },
  year: { type: Number, required: true },
  status: { type: String, default: 'DRAFT' },
  progress: { type: Number, default: 0 },
  keyResults: [keyResultSchema]
}, { timestamps: true });

export default mongoose.model('MyObjective', myObjectiveSchema);