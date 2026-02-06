import mongoose from 'mongoose';

const keyResultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  targetValue: { type: Number, required: true },
  unit: { type: String, required: true },
  currentValue: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }
});

const myObjectiveSchema = new mongoose.Schema({
  title: { type: String, required: true },
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  department: { type: String },
  quarter: { type: String, required: true },
  year: { type: Number, required: true },
  status: { type: String, default: 'DRAFT' },
  keyResults: [keyResultSchema]
}, { timestamps: true });

export default mongoose.model('MyObjective', myObjectiveSchema);