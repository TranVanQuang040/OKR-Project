import mongoose from 'mongoose';

const KPISchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['DEPARTMENT', 'TEAM', 'PERSONAL'], required: true },
    workgroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workgroup', default: null },

    // Metrics
    targetValue: { type: Number, default: 100 },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: '%' }, // %, tasks, etc.
    weight: { type: Number, default: 1, min: 1, max: 10 }, // Importance weight (Scale 1-10)
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
    assignedToDepartment: { type: String }, // User department for display
    assignedBy: { type: String }, // Manager ID
    assignedByName: { type: String }, // Manager name

    // OKR Integration
    linkedOKRId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective' },
    linkedOKRTitle: { type: String },
    linkedKRId: { type: String },
    linkedKRTitle: { type: String },
    linkedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },

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

// Auto-update linked OKR after saving
KPISchema.post('save', async function (doc) {
    if (doc.linkedOKRId) {
        try {
            const Objective = mongoose.model('Objective');
            const okr = await Objective.findById(doc.linkedOKRId);

            if (okr) {
                if (doc.linkedKRId) {
                    const kr = okr.keyResults.id(doc.linkedKRId);
                    if (kr) {
                        // We find all KPIs linked to this specific KR to get an average or sum
                        const KPI = mongoose.model('KPI');
                        const linkedKPIs = await KPI.find({ linkedKRId: doc.linkedKRId });

                        const totalWeight = linkedKPIs.reduce((sum, k) => sum + (k.weight || 1), 0);
                        const weightedProgress = linkedKPIs.reduce((sum, k) => sum + ((k.progress || 0) * (k.weight || 1)), 0);

                        kr.progress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
                        kr.currentValue = Math.round((kr.progress / 100) * (kr.targetValue || 100));
                    }
                }
                // Just calling .save() will trigger the Objective's pre-save 
                // which recalculates the overall status and progress based on all KRs
                await okr.save();
            }
        } catch (err) {
            console.error('Error syncing OKR in KPI post-save:', err);
        }
    }
});


export default mongoose.model('KPI', KPISchema);
