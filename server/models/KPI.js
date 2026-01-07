import mongoose from 'mongoose';

const KPISchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['DEPARTMENT', 'PERSONAL'], required: true },

    // Metrics
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, required: true }, // %, tasks, etc.
    progress: { type: Number, default: 0 }, // 0-100

    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'OVERDUE'],
        default: 'ACTIVE'
    },

    // Assignment
    department: { type: String, required: true },
    assignedTo: { type: String }, // User ID for personal KPI
    assignedToName: { type: String }, // User name for display
    assignedBy: { type: String }, // Manager ID
    assignedByName: { type: String }, // Manager name

    // OKR Integration
    linkedOKRId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective' },
    linkedOKRTitle: { type: String },

    // Time tracking
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    quarter: { type: String, required: true },
    year: { type: Number, required: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Auto-calculate progress before saving
KPISchema.pre('save', function (next) {
    if (this.targetValue > 0) {
        this.progress = Math.min(100, Math.round((this.currentValue / this.targetValue) * 100));
    }

    // Auto-update status
    if (this.progress >= 100) {
        this.status = 'COMPLETED';
    } else if (this.endDate && new Date() > this.endDate) {
        this.status = 'OVERDUE';
    } else {
        this.status = 'ACTIVE';
    }

    this.updatedAt = Date.now();
    next();
});

export default mongoose.model('KPI', KPISchema);
