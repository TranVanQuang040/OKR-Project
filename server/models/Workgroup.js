import mongoose from 'mongoose';

const WorkgroupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Workgroup', WorkgroupSchema);
