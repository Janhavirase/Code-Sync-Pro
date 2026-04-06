const express = require('express');
const router = express.Router();
const CommunityProject = require('../models/CommunityProject'); 
const Project = require('../models/Project'); // Your private project model
const { v4: uuidv4 } = require('uuid'); // To generate a new room ID
// ✨ IMPORT YOUR AUTH MIDDLEWARE ✨
const auth = require('../middleware/auth'); 
const PullRequest = require('../models/PullRequest');
// Drop the 'auth' middleware right into the route definition
// 🔓 REMOVED 'auth' middleware so no token is required
router.post('/publish', async (req, res) => {
    try {
        const { title, description, tags, codeSnapshot, authorName } = req.body;

        // Since we removed 'auth', req.user.id won't exist. 
        // We'll use a fallback ID or grab it from the frontend if needed.
        const newProject = new CommunityProject({
            title,
            description,
            tags,
            codeSnapshot,
            authorName,
            authorId: req.body.userId || "698f24f4568ed89b6bef334e" // Temporary fallback
        });

        await newProject.save();
        res.status(201).json({ project: newProject });
    } catch (err) {
        console.error("🔥 Backend Error:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});
// 🚀 FORK A PROJECT
// 🚀 FORK A PROJECT
// 🚀 FORK A PROJECT (WITH X-RAY DEBUGGING)
router.post('/fork/:id', async (req, res) => {
    try {
        console.log("\n=============================================");
        console.log("🚀 1. FORK INITIATED for Project ID:", req.params.id);
        
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "User ID required." });

        // A. FIND PUBLIC PROJECT
        const publicProject = await CommunityProject.findById(req.params.id);
        if (!publicProject) {
            console.log("❌ ERROR: Public project not found in DB.");
            return res.status(404).json({ error: "Project not found." });
        }
        console.log(`✅ 2. Found Community Project: "${publicProject.title}"`);
        console.log(`📦 3. Number of files in Snapshot:`, publicProject.codeSnapshot?.length);

        // B. INSPECT THE FIRST FILE
        if (publicProject.codeSnapshot && publicProject.codeSnapshot.length > 0) {
            console.log("🔍 4. Raw File [0] from Community DB looks like this:");
            console.log(publicProject.codeSnapshot[0]);
        }

        // C. CLEAN THE FILES (The Bulletproof Way)
        const cleanFiles = publicProject.codeSnapshot.map(file => {
            // Convert Mongoose document to plain object, then delete the _id
            const plainFile = file.toObject ? file.toObject() : { ...file };
            delete plainFile._id;
            return plainFile;
        });

        console.log("🧹 5. Files Cleaned! Number of clean files:", cleanFiles.length);
        if (cleanFiles.length > 0) {
             console.log("🔍 6. Clean File [0] ready for saving looks like this:");
             console.log(cleanFiles[0]);
        }

        // D. SAVE NEW PROJECT
        const newRoomId = uuidv4();
        const forkedProject = new Project({
            name: `Forked - ${publicProject.title}`,
            roomId: newRoomId,
            owner: userId,
            files: cleanFiles, 
            isFork: true,
            parentCommunityProjectId: publicProject._id,
            parentOwnerId: publicProject.authorId
        });

        const savedProject = await forkedProject.save();
        console.log("💾 7. SAVED! New Private Project ID:", savedProject._id);
        console.log("📁 8. Files ACTUALLY saved to new project:", savedProject.files?.length);
        console.log("=============================================\n");

        publicProject.forks = (publicProject.forks || 0) + 1;
        await publicProject.save();

        res.status(200).json({ project: savedProject });

    } catch (err) {
        console.error("🔥 FORK CRASH:", err);
        res.status(500).json({ error: "Internal server error." });
    }
});
// 🚀 SUBMIT A PULL REQUEST (FIX)
router.post('/pr', async (req, res) => {
    try {
        const { targetProjectId, targetOwnerId, senderId, senderName, title, description, files } = req.body;

        const newPR = new PullRequest({
            targetProjectId,
            targetOwnerId,
            senderId,
            senderName,
            title,
            description,
            files
        });

        await newPR.save();
        res.status(201).json({ message: "Fix submitted successfully!", pr: newPR });

    } catch (err) {
        console.error("🔥 PR Submission Error:", err);
        res.status(500).json({ error: "Failed to submit Pull Request." });
    }
});
router.get('/feed', async (req, res) => {
    try {
        // Find all projects, sort by newest first (createdAt: -1), and limit to the latest 50 to prevent slow load times.
        const projects = await CommunityProject.find()
            .sort({ createdAt: -1 })
            .limit(50);

        // Send the projects back to the frontend
        res.status(200).json({ 
            message: "Feed fetched successfully",
            projects: projects 
        });

    } catch (error) {
        console.error("🔥 Error fetching community feed:", error);
        res.status(500).json({ error: "Internal server error. Failed to load community feed." });
    }
});
// 📥 GET USER'S PULL REQUEST INBOX
// 📥 GET USER'S PULL REQUEST INBOX
router.get('/pr/inbox/:userId', async (req, res) => {
    try {
        // ✨ THE FIX: We use populate to grab the original project's code!
        const prs = await PullRequest.find({ targetOwnerId: req.params.userId })
            .populate('targetProjectId', 'codeSnapshot title') // 👈 Adds original code to the payload
            .sort({ createdAt: -1 });
            
        res.status(200).json(prs);
    } catch (err) {
        console.error("🔥 Inbox Error:", err);
        res.status(500).json({ error: "Failed to fetch inbox." });
    }
});

// 🚀 MERGE A PULL REQUEST
router.post('/pr/:prId/merge', async (req, res) => {
    try {
        const pr = await PullRequest.findById(req.params.prId);
        
        if (!pr || pr.status !== 'pending') {
            return res.status(400).json({ error: "PR is either invalid or already processed." });
        }

        // 1. Find the original Community Project
        const targetProject = await CommunityProject.findById(pr.targetProjectId);
        if (!targetProject) {
            return res.status(404).json({ error: "Original project no longer exists." });
        }

        // 2. THE MERGE: Replace the old code with the new fixed code!
        targetProject.codeSnapshot = pr.files;
        await targetProject.save();

        // 3. Mark the PR as Merged
        pr.status = 'merged';
        await pr.save();

        res.status(200).json({ message: "Code merged successfully! 🎉" });

    } catch (err) {
        console.error("🔥 Merge Error:", err);
        res.status(500).json({ error: "Failed to merge PR." });
    }
});
module.exports = router;