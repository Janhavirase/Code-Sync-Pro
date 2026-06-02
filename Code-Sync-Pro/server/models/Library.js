import mongoose from 'mongoose';

const LibrarySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    roomId: {
        type: String,
        required: true,
    },
    files: {
        type: Object,
        required: true,
    },
    
    // ✅ ADD THIS SECTION (The Gatekeeper)
    isApproved: {
        type: Boolean,
        default: false // Default to false so you must approve them first
    }

}, { timestamps: true });


// ... schema definition remains the same ...

const Library = mongoose.models.Library || mongoose.model('Library', LibrarySchema);

export default Library;