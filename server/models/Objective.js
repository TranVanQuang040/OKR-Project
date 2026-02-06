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
  startDate: { type: Date }, // Ngày bắt đầu thực tế hoặc dự kiến
  endDate: { type: Date },   // Ngày kết thúc thực tế hoặc dự kiến
  status: { type: String, default: 'DRAFT' },
  progress: { type: Number, default: 0 },
  keyResults: [KeyResultSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index cho các truy vấn phổ biến - cải thiện hiệu suất
ObjectiveSchema.index({ ownerId: 1, status: 1 });
ObjectiveSchema.index({ department: 1 });
ObjectiveSchema.index({ parentId: 1 });
ObjectiveSchema.index({ year: 1, quarter: 1 });
ObjectiveSchema.index({ status: 1, progress: 1 });

// Middleware: Auto-update updatedAt khi có thay đổi
ObjectiveSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

// Middleware: Tính toán progress từ KeyResults nếu có
ObjectiveSchema.pre('save', function() {
  if (this.keyResults && this.keyResults.length > 0) {
    const totalProgress = this.keyResults.reduce((sum, kr) => sum + ((kr.progress || 0) * (kr.weight || 1)), 0);
    const totalWeight = this.keyResults.reduce((sum, kr) => sum + (kr.weight || 1), 0);
    this.progress = totalWeight > 0 ? Math.round(totalProgress / totalWeight) : 0;
  }
  this.updatedAt = new Date();
});

export default mongoose.model('Objective', ObjectiveSchema);
