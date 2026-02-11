import mongoose from 'mongoose';

const CycleSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "Q1 2026"
    quarter: { type: String, required: true }, // Q1, Q2, Q3, Q4
    year: { type: Number, required: true },
    status: {
        type: String,
        enum: ['PLANNING', 'ACTIVE', 'CLOSED'],
        default: 'PLANNING'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: String }, // User ID
    createdByName: { type: String }
}, { timestamps: true });

export default mongoose.model('Cycle', CycleSchema);
