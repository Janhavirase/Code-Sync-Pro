import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
    title: { type: String, required: true },
    desc: { type: String },
    code: { type: String, required: true }, // The actual code snippet
    language: { type: String, default: 'javascript' },
    
    // Link to the user who created it
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // "Community" means public? (Optional)
    isPublic: { type: Boolean, default: true },
    
    likes: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Template', templateSchema);