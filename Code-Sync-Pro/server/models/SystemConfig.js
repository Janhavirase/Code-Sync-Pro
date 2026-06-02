import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
    allowSignups: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false }, // If true, only Admins can edit
    enableCompiler: { type: Boolean, default: true },   // If false, 'Run Code' is hidden
    lastUpdatedBy: { type: String } // Admin username
}, { timestamps: true });

export default mongoose.model('SystemConfig', systemConfigSchema);