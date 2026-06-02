import Project from '../models/Project.js';
import User from '../models/User.js';

// 1. ✅ CREATE PROJECT (The Critical One for Stats)
export const createProject = async (req, res) => {
    try {
        // We expect these from the frontend
        const { name, roomId, userId, description, language, code } = req.body;

        // A. Create the Project Document
        const project = new Project({
            name,
            roomId,
            owner: userId, // 👈 KEY: Links project to the user for the "Projects: 5" stat
            description: description || "",
            language: language || "javascript",
            
            // Flexible: Supports both a simple code string or a file structure
            files: [{ 
                name: 'main', 
                language: language || 'javascript', 
                value: code || '// Start coding...' 
            }],
            
            collaborators: [] // Starts empty
        });

        // B. Save Project to Database
        await project.save();

        // C. ✅ DOUBLE LINKING: Add this project ID to the User's list immediately
        // This ensures the User Profile "Projects" count updates instantly
        if (userId) {
            await User.findByIdAndUpdate(userId, { 
                $push: { projects: project._id } 
            });
        }

        res.status(201).json(project);
    } catch (err) {
        console.error("Create Project Error:", err);
        res.status(500).json({ error: "Failed to create project" });
    }
};

// 2. GET ALL PROJECTS (For Dashboard)
export const getAllProjects = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find projects where the user is the OWNER
        // (You can also add logic here to find projects where they are a collaborator)
        const projects = await Project.find({ owner: userId }).sort({ updatedAt: -1 });

        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. GET SINGLE PROJECT (For Editor Loading)
export const getProjectByRoomId = async (req, res) => {
    try {
        const { roomId } = req.params;
        const project = await Project.findOne({ roomId });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// --- Delete a Project ---
export const deleteProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const deletedProject = await Project.findByIdAndDelete(projectId);

        if (!deletedProject) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        res.status(200).json({ success: true, message: "Project deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// 4. SAVE CODE (Updates the project content)
export const saveProjectCode = async (req, res) => {
    try {
        const { roomId, files } = req.body;

        const project = await Project.findOneAndUpdate(
            { roomId },
            { files }, // Updates the files array with new code
            { new: true } // Returns the updated document
        );

        if (!project) return res.status(404).json({ message: "Project not found" });

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};