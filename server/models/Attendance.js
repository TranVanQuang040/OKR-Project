import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  department: { type: String, default: '' },
  dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
  checkInAt: { type: Date, required: true, default: Date.now },
  checkOutAt: { type: Date, default: null },
  status: { type: String, enum: ['PRESENT', 'LATE', 'HALF_DAY'], default: 'PRESENT' },
  lateMinutes: { type: Number, default: 0, min: 0 },
  totalWorkMinutes: { type: Number, default: 0, min: 0 },
  note: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  networkInfo: {
    type: { type: String, default: '' },
    wifiName: { type: String, default: '' },
    effectiveType: { type: String, default: '' }
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

AttendanceSchema.index({ userId: 1, dateKey: 1 }, { unique: true });
AttendanceSchema.index({ dateKey: 1, department: 1 });

AttendanceSchema.pre('save', function (next) {
  if (this.checkInAt && this.checkOutAt) {
    const diffMs = this.checkOutAt.getTime() - this.checkInAt.getTime();
    this.totalWorkMinutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
  }
  next();
});

export default mongoose.model('Attendance', AttendanceSchema);
