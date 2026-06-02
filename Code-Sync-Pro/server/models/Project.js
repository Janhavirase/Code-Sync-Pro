import mongoose from 'mongoose';
const projectSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, default: "Untitled Project" },
    githubUrl: {
        type: String,
        default: null
    }, 
    
    // Owner Link (Required for "Project Count")
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Collaborators List (Required for "Collaborators Count")
    collaborators: [{ type: String }], 
    
    // The Code Files
    files: [{
        name: String,
        language: String,
        value: String
    }],

    // ✨ ADDED FOR PULL REQUESTS: The "Return Address"
    isFork: { type: Boolean, default: false },
    parentCommunityProjectId: { type: String }, // Links back to CommunityProject
    parentOwnerId: { type: String }             // The person who receives the PR
    
}, { timestamps: true });
export default mongoose.model('Project', projectSchema);