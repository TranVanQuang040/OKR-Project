import mongoose from 'mongoose';

const KeyResultTemplateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    unit: { type: String, default: '%' },
    targetValue: { type: Number, default: 100 },
    weight: { type: Number, default: 1, min: 1, max: 10 }
});

const OKRTemplateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: {
        type: String,
        enum: ['COMPANY', 'DEPARTMENT', 'TEAM', 'PERSONAL'],
        required: true
    },
    industry: { type: String }, // Technology, Finance, Healthcare, etc.
    category: { type: String }, // Revenue, Growth, Efficiency, etc.
    department: { type: String }, // For DEPARTMENT type templates
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    tags: [String],
    suggestedKRs: [KeyResultTemplateSchema],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('OKRTemplate', OKRTemplateSchema);
