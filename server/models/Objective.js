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
  type: { type: String, enum: ['COMPANY', 'DEPARTMENT', 'TEAM', 'PERSONAL'], default: 'PERSONAL' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', default: null },
  workgroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workgroup', default: null },
  priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  tags: [String],
  ownerId: String,
  ownerName: String,
  department: String,
  quarter: String,
  year: Number,
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'APPROVED', 'REJECTED', 'PENDING_APPROVAL'], default: 'DRAFT' },
  progress: { type: Number, default: 0 },
  keyResults: [KeyResultSchema],
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-calculate progress before saving
ObjectiveSchema.pre('save', function (next) {
  if (this.keyResults && this.keyResults.length > 0) {
    let totalWeight = 0;
    let weightedProgress = 0;

    this.keyResults.forEach(kr => {
      // Calculate KR progress first if not set (for manual updates)
      if (kr.targetValue > 0) {
        kr.progress = Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
      }

      const weight = kr.weight || 1;
      totalWeight += weight;
      weightedProgress += (kr.progress || 0) * weight;
    });

    this.progress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
  }

  // Auto-update status based on progress
  if (this.progress >= 100 && (this.status === 'ACTIVE' || this.status === 'APPROVED')) {
    this.status = 'COMPLETED';
  }

  next();
});

export default mongoose.model('Objective', ObjectiveSchema);

