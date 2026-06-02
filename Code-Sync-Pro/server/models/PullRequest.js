import mongoose from 'mongoose';

const PullRequestSchema = new mongoose.Schema({
    targetProjectId: { // The original public Community Project
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CommunityProject',
        required: true
    },
    targetOwnerId: { // Who needs to review this?
        type: String,
        required: true
    },
    senderId: { // Who is submitting the fix?
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    title: { // "Fixed the weird CSS bug"
        type: String, 
        required: true
    },
    description: String,
    files: { // The actual fixed code!
        type: Array, 
        required: true
    },
    status: { 
        type: String, 
        enum: ['pending', 'merged', 'rejected'],
        default: 'pending' 
    }
}, { timestamps: true });

export default mongoose.model('Library', PullRequestSchema);