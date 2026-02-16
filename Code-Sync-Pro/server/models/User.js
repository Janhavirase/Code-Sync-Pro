const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // --- Identity ---
    username: { type: String, required: true, unique: true },
    email: { type: String, required: false }, 
    password: { type: String, required: true },
    
    // ✅ NEW: ADMIN ROLE (The most important line)
    role: { 
        type: String, 
        enum: ['user', 'admin'], // Only these two values are allowed
        default: 'user'          // Everyone starts as a normal user
    },

    // --- Profile ---
    bio: { 
        type: String, 
        default: "Full-Stack Developer | Building the future of collaborative coding." 
    },
    
    // --- Stats Buckets ---
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    hoursCoded: { type: Number, default: 0 },
    
    // --- Relationships ---
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);