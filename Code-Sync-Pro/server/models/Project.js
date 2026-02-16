const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, default: "Untitled Project" },
    githubUrl: {
        type: String,
        default: null
    }, // ✅ Comma added here
    
    // ✅ Owner Link (Required for "Project Count")
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // ✅ Collaborators List (Required for "Collaborators Count")
    collaborators: [{ type: String }], // Stores usernames (e.g., ["jack", "jane"])
    
    // The Code Files
    files: [{
        name: String,
        language: String,
        value: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);