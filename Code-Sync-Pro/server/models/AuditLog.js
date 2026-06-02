import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String, required: true }, // Store name snapshot in case user is deleted
    action: { type: String, required: true }, // e.g., "DELETE_USER", "BROADCAST_SENT"
    target: { type: String }, // e.g., "User: john_doe" or "System"
    details: { type: String }, // e.g., "Reason: Violated terms"
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Auto-delete logs older than 30 days (Senior Dev Move: Data Retention Policy)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('AuditLog', auditLogSchema);