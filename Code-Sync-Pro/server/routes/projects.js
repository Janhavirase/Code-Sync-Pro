import express from 'express';
const router = express.Router();
import Project from '../models/Project.js';
import User from '../models/User.js'; // ✅ CRITICAL IMPORT

// 1. GET ALL PROJECTS FOR A USER
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;

        // Validation
        if (!userId || userId === 'undefined' || userId === 'null') {
            return res.status(400).json({ message: "Missing or Invalid User ID" });
        }

        // Fetch projects where this user is the OWNER
        const projects = await Project.find({ owner: userId }).sort({ updatedAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. CREATE OR UPDATE PROJECT
router.post('/', async (req, res) => {
    try {
        const { roomId, name, userId, files } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is missing." });
        }

        // Check if project exists
        let project = await Project.findOne({ roomId });

        if (project) {
            // --- UPDATE EXISTING ---
            project.files = files;
            project.name = name;
            project.updatedAt = Date.now();
            await project.save();
            console.log("✅ Project Updated!");
            return res.json(project);
        } else {
            // --- CREATE NEW ---
            const newProject = new Project({ 
                roomId, 
                name, 
                owner: userId, // 👈 Links Project to User
                files,
                collaborators: [] // Initialize empty
            });
            
            await newProject.save();

            // 🚀 THE MAGICAL FIX:
            // Add this new project's ID to the User's "projects" list
            await User.findByIdAndUpdate(userId, { 
                $push: { projects: newProject._id } 
            });

            console.log("✅ New Project Created & Linked to User!");
            return res.status(201).json(newProject);
        }

    } catch (err) {
        console.error("❌ SAVE FAILED:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. GET SINGLE PROJECT (For Editor)
router.get('/:roomId', async (req, res) => {
    try {
        const project = await Project.findOne({ roomId: req.params.roomId });
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 4. DELETE A PROJECT
router.delete('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        // 1. Delete the project from the Projects collection
        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        // 2. OPTIONAL: Remove the project reference from the User's project list
        await User.findByIdAndUpdate(deletedProject.owner, {
            $pull: { projects: projectId }
        });

        console.log(`🗑️ Project ${projectId} deleted and unlinked from user.`);
        res.json({ message: "Project deleted successfully" });
    } catch (err) {
        console.error("❌ DELETE FAILED:", err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;