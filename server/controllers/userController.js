const User = require('../models/User');
const Project = require('../models/Project');

// --- Helper Functions ---
const isYesterday = (d1, d2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const date1 = new Date(d1).setHours(0, 0, 0, 0);
    const date2 = new Date(d2).setHours(0, 0, 0, 0);
    return (date2 - date1 === oneDay);
};

const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

const getColorForLang = (lang) => {
    const colors = {
        javascript: "bg-yellow-400",
        python: "bg-blue-500",
        java: "bg-orange-500",
        cpp: "bg-indigo-500",
        html: "bg-orange-600",
        css: "bg-blue-400",
        react: "bg-cyan-400",
        nodejs: "bg-green-500"
    };
    return colors[lang.toLowerCase()] || "bg-gray-500";
};

// --- 1. Get Profile & Calculate Stats ---
exports.getUserProfile = async (req, res) => {
    try {
        console.log("⚡ CONTROLLER: calculating stats for", req.params.userId);

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // --- A. STREAK LOGIC ---
        const today = new Date();
        const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        
        if (!lastActive) { 
            user.streak = 1; 
        } else if (isYesterday(lastActive, today)) { 
            user.streak += 1; 
        } else if (!isSameDay(lastActive, today)) { 
            user.streak = 1; 
        }
        user.lastActiveDate = today;

        // --- B. PROJECT, COLLAB, & GITHUB STATS ---
        const userProjects = await Project.find({ owner: user._id }); 
        
        const uniqueCollaborators = new Set();
        const languageMap = {};
        const deployedProjects = [];
        let totalFiles = 0;

        userProjects.forEach(p => {
            // Collect Shipped Projects
            if (p.githubUrl) {
                deployedProjects.push({
                    _id: p._id,
                    name: p.name || "Untitled Project",
                    githubUrl: p.githubUrl,
                    updatedAt: p.updatedAt
                });
            }

            // Count unique collaborators
            if (p.collaborators && Array.isArray(p.collaborators)) {
                p.collaborators.forEach(c => uniqueCollaborators.add(c));
            }

            // Count languages for Tech Stack
            if (p.files && Array.isArray(p.files)) {
                p.files.forEach(file => {
                    if (file.language && file.value && file.value.length > 10) { 
                        const lang = file.language.toLowerCase();
                        languageMap[lang] = (languageMap[lang] || 0) + 1;
                        totalFiles++;
                    }
                });
            }
        });

        // Convert Map to Array for Frontend
        const languages = Object.keys(languageMap).map(lang => ({
            name: lang.toUpperCase(),
            percentage: totalFiles > 0 ? Math.round((languageMap[lang] / totalFiles) * 100) : 0,
            color: getColorForLang(lang)
        })).sort((a, b) => b.percentage - a.percentage).slice(0, 4);

        // Save streak/activity updates
        await user.save();

        // Final Response
        res.json({
            name: user.username,
            username: user.email ? user.email.split('@')[0] : user.username,
            bio: user.bio,
            joinDate: user.createdAt.toISOString().split('T')[0],
            stats: {
                projects: userProjects.length,
                hoursCoded: Math.round(user.hoursCoded || 0), 
                streak: user.streak,
                collaborators: uniqueCollaborators.size,
                shippedCount: deployedProjects.length 
            },
            languages: languages,
            deployedProjects: deployedProjects 
        });

    } catch (err) {
        console.error("❌ Profile Error:", err);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- 2. Update Activity Hours ---
exports.updateUserActivity = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.hoursCoded = (user.hoursCoded || 0) + 0.1; 
        await user.save();
        
        res.status(200).json({ hours: user.hoursCoded });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- 3. Update Profile Information ---
exports.updateUserProfile = async (req, res) => {
    try {
        const { bio, username } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { bio, username },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.json({
            message: "Profile updated successfully!",
            user: {
                name: updatedUser.username,
                bio: updatedUser.bio
            }
        });
    } catch (err) {
        console.error("❌ Update Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};