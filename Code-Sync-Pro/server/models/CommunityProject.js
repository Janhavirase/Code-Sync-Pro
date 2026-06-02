import mongoose from 'mongoose';

const communityProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
    
    // Securely linking to your existing User model
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true }, 
    
    // The Snapshot: An array containing the actual files and their code
    codeSnapshot: { type: Array, required: true }, 
    //contributors
    contributors: { type: Array, default: [] },
    // Git Meta-data
    forks: { type: Number, default: 0 },
    originalProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityProject', default: null } // For tracking forks
}, { timestamps: true });

export default mongoose.model('CommunityProject',  communityProjectSchema);
