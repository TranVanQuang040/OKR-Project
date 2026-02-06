import mongoose from 'mongoose';

const CheckInHistorySchema = new mongoose.Schema({
    objectiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Objective', required: true },
    keyResultId: { type: String }, // Optional: null nếu check-in cho Objective chung, có giá trị nếu check-in KR cụ thể
    checkinDate: { type: Date, default: Date.now },
    previousValue: { type: Number, default: 0 },
    newValue: { type: Number, required: true },
    comment: { type: String },
    createdBy: { type: String }, // User ID hoặc Name người check-in
    createdByName: { type: String } // Tên người check-in để hiển thị nhanh
});

// Index để query lịch sử của 1 OKR nhanh chóng
CheckInHistorySchema.index({ objectiveId: 1, checkinDate: -1 });

export default mongoose.model('CheckInHistory', CheckInHistorySchema);
