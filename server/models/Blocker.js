import mongoose from 'mongoose';

const BlockerSchema = new mongoose.Schema({
    description: { type: String, required: true },
    objectiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', required: true },
    krId: { type: String }, // Optional: Blocker này thuộc về KR nào (nếu có)
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    ownerId: { type: String }, // Người đang gặp blocker
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolutionNote: { type: String } // Ghi chú cách giải quyết
});

// Index để lọc blocker chưa giải quyết
BlockerSchema.index({ objectiveId: 1, status: 1 });
BlockerSchema.index({ status: 1, severity: 1 }); // Index cho dashboard admin lọc blocker nghiêm trọng

export default mongoose.model('Blocker', BlockerSchema);
