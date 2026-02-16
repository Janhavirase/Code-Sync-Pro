const express = require('express');
const router = express.Router();
const os = require('os'); // Moved to top for cleaner code
const User = require('../models/User');
const Project = require('../models/Project');
const Library = require('../models/Library'); 
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
// 🛡️ MIDDLEWARE: Check if the user is an Admin
const isAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id']; 
        
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: No user ID provided" });
        }

        const user = await User.findById(userId);
        
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied: You are not an Admin." });
        }

        // ✅ IMPORTANT: Attach user to request so we can log WHO did the action
        req.user = user; 
        next(); 
    } catch (err) {
        console.error("Admin Auth Error:", err);
        res.status(500).json({ message: "Server Error during Admin Auth" });
    }
};

// ✅ HELPER: Internal function to create logs
const logAction = async (adminUser, action, target, details, ip) => {
    try {
        await AuditLog.create({
            adminId: adminUser._id,
            adminName: adminUser.username,
            action,
            target,
            details,
            ipAddress: ip
        });
    } catch (err) {
        console.error("❌ Failed to create audit log:", err.message);
    }
};

// ==========================================
// 📊 1. DASHBOARD STATS
// ==========================================
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProjects = await Project.countDocuments();
        const totalTemplates = await Library.countDocuments();
        
        const graphData = [
            { name: 'Jan', users: Math.floor(totalUsers * 0.2), projects: 5 },
            { name: 'Feb', users: Math.floor(totalUsers * 0.4), projects: 12 },
            { name: 'Mar', users: Math.floor(totalUsers * 0.6), projects: 25 },
            { name: 'Apr', users: Math.floor(totalUsers * 0.8), projects: 40 },
            { name: 'May', users: Math.floor(totalUsers * 0.9), projects: 60 },
            { name: 'Jun', users: totalUsers, projects: totalProjects },
        ];

        res.json({ totalUsers, totalProjects, totalTemplates, graphData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 👥 2. USER MANAGEMENT
// ==========================================
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const userToDelete = await User.findById(userId);
        
        if (!userToDelete) return res.status(404).json({ message: "User not found" });

        if (userToDelete.role === 'admin') {
            return res.status(400).json({ message: "You cannot delete an Admin." });
        }

        await User.findByIdAndDelete(userId);
        await Project.deleteMany({ owner: userId });

        // ✅ LOG IT
        await logAction(req.user, "DELETE_USER", userToDelete.username, "Deleted user and their projects", req.ip);

        res.json({ message: "User and their data deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📚 3. LIBRARY CONTROL (Moderation Center)
// ==========================================

// GET ALL ITEMS
router.get('/library', isAdmin, async (req, res) => {
    try {
        const items = await Library.find()
            .populate('owner', 'username email') 
            .sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TOGGLE APPROVAL
router.patch('/library/:id/approve', isAdmin, async (req, res) => {
    try {
        const item = await Library.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Item not found" });

        item.isApproved = !item.isApproved;
        await item.save();

        // ✅ LOG IT
        const actionType = item.isApproved ? "APPROVE_ITEM" : "HIDE_ITEM";
        await logAction(req.user, actionType, item.title, `Item ID: ${item._id}`, req.ip);

        res.json({ message: `Item ${item.isApproved ? "Approved" : "Hidden"}`, item });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDIT METADATA
router.put('/library/:id', isAdmin, async (req, res) => {
    try {
        const { title, desc } = req.body;
        const updatedItem = await Library.findByIdAndUpdate(
            req.params.id, 
            { title, desc },
            { new: true }
        );

        // ✅ LOG IT
        if (updatedItem) {
            await logAction(req.user, "EDIT_METADATA", updatedItem.title, `Updated description/title`, req.ip);
        }

        res.json(updatedItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE ITEM
router.delete('/library/:id', isAdmin, async (req, res) => {
    try {
        const itemToDelete = await Library.findById(req.params.id);
        if (itemToDelete) {
            await Library.findByIdAndDelete(req.params.id);
            
            // ✅ LOG IT
            await logAction(req.user, "DELETE_LIBRARY_ITEM", itemToDelete.title, "Permanently removed from library", req.ip);
        }
        res.json({ message: "Library item deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 📜 4. AUDIT LOGS
// ==========================================
router.get('/audit-logs', isAdmin, async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .sort({ timestamp: -1 }) // Newest first
            .limit(50); // Pagination limit
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 🏥 5. SYSTEM HEALTH CHECK
// ==========================================
router.get('/health', isAdmin, async (req, res) => {
    try {
        // 1. Calculate Uptime
        const uptimeInSeconds = process.uptime();
        
        // 2. Memory Usage
        const usedMemory = process.memoryUsage().rss;
        const totalMemory = os.totalmem();
        const memoryUsagePercentage = ((usedMemory / totalMemory) * 100).toFixed(2);

        // 3. CPU Load
        const cpus = os.cpus();
        const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
        const numCores = cpus.length;

        // 4. Send the Matrix
        const healthData = {
            uptime: uptimeInSeconds,
            message: 'Server is healthy 🟢',
            timestamp: new Date(),
            memory: {
                used: (usedMemory / 1024 / 1024).toFixed(2) + ' MB',
                total: (totalMemory / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                percentage: memoryUsagePercentage + '%'
            },
            os: {
                platform: os.platform(),
                release: os.release(),
                type: os.type(),
                cpu: cpuModel,
                cores: numCores
            }
        };

        res.json(healthData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ==========================================
// 🎛️ 6. FEATURE FLAGS (System Control)
// ==========================================

// GET CONFIG (Public - called by App.jsx on load)
router.get('/config', async (req, res) => {
    try {
        // Find the config, or create default if it doesn't exist
        let config = await SystemConfig.findOne();
        if (!config) {
            config = await SystemConfig.create({});
        }
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE CONFIG (Admin Only)
router.put('/config', isAdmin, async (req, res) => {
    try {
        const { allowSignups, maintenanceMode, enableCompiler } = req.body;
        
        let config = await SystemConfig.findOne();
        if (!config) config = new SystemConfig();

        config.allowSignups = allowSignups;
        config.maintenanceMode = maintenanceMode;
        config.enableCompiler = enableCompiler;
        config.lastUpdatedBy = req.user.username;
        
        await config.save();

        // 🔥 REAL-TIME UPDATE: Tell all clients via Socket!
        // (Assuming you pass 'io' to your routes or import it)
        // For now, we return it, and the Frontend Admin Panel will emit the socket event
        
        // ✅ LOG IT
        await logAction(req.user, "UPDATE_SYSTEM_CONFIG", "Global Settings", `Signups: ${allowSignups}, Maint: ${maintenanceMode}`, req.ip);

        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;