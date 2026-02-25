import mongoose from 'mongoose';

const WorkScheduleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    department: { type: String, default: '' },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    shift: {
        type: String,
        enum: ['FULL_DAY', 'HALF_DAY', 'MORNING', 'AFTERNOON', 'NIGHT', 'OFF', 'UNEXCUSED_ABSENCE', 'ONLINE'],
        default: 'FULL_DAY'
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'APPROVED'
    },
    note: { type: String, default: '' }
}, { timestamps: true });

// Ensure a user only has one schedule entry per day
WorkScheduleSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model('WorkSchedule', WorkScheduleSchema);
