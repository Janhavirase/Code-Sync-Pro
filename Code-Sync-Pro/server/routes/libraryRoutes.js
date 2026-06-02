import express from 'express';
const router = express.Router();
// ✅ FIX: Import 'Library' (The one with isApproved and owner), NOT 'Template'
import Library from '../models/Library.js';
// --- GET All Public/Approved Items ---
router.get('/', async (req, res) => {
    try {
        // ✅ 1. Use 'Library' to match your Admin Panel
        // ✅ 2. Filter { isApproved: true } to hide pending items
        const items = await Library.find({ isApproved: true }) 
            .populate('owner', 'username') // Library uses 'owner', Template used 'author'
            .sort({ createdAt: -1 });
            
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET a single library item ---
router.get('/:id', async (req, res) => {
    try {
        const item = await Library.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ message: "Contribution not found" });
        }
        
        res.json(item);
    } catch (err) {
        console.error("GET Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- UPDATE a library item ---
router.put('/:id', async (req, res) => {
    try {
        const { title, desc } = req.body;
        
        const updatedItem = await Library.findByIdAndUpdate(
            req.params.id, 
            { title, desc }, 
            { new: true } 
        );

        if (!updatedItem) {
            return res.status(404).json({ success: false, message: "Contribution not found" });
        }

        res.json(updatedItem);
    } catch (err) {
        console.error("❌ UPDATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- CREATE A NEW LIBRARY ITEM (The Missing Piece) ---
router.post('/', async (req, res) => {
    try {
        const { title, desc, roomId, files, userId } = req.body;

        // 1. Create the new item in the 'Library' collection
        const newItem = new Library({
            title,
            desc,
            roomId,
            files,
            owner: userId, // Ensure your frontend sends 'userId'
            
            // 🛑 CRITICAL: We do NOT set isApproved here.
            // The Schema defaults it to 'false', which is exactly what we want.
        });

        // 2. Save it to the database
        const savedItem = await newItem.save();
        
        console.log("✅ New Item Created (Pending Approval):", savedItem.title);
        res.json(savedItem);
        
    } catch (err) {
        console.error("❌ CREATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});
export default router;