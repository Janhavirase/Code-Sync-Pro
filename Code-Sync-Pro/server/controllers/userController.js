import User from '../models/User.js';
import Project from '../models/Project.js';
import CommunityProject from '../models/CommunityProject.js';

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
// --- 1. Get Profile & Calculate Stats ---
export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("⚡ CONTROLLER: Calculating full profile for", userId);

        const user = await User.findById(userId);
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

        // --- B. FETCH ALL PROJECT TYPES ---
        // 1. Private Projects owned by the user
        const userProjects = await Project.find({ owner: user._id }); 
        
        // 2. Open Source Contributions (The "Trophies")
        // We clean the username of any trailing dots before searching
        // --- C. FETCH OPEN SOURCE CONTRIBUTIONS (Nuclear Debug Version) ---
        console.log("\n====== 🚨 SENIOR DEBUGGER INITIATED ======");
        console.log("1. Searching for User:", user.username, "| ID:", user._id);

        // 🕵️ STEP 1: Let's see exactly what a project looks like in your DB
        const sampleProject = await CommunityProject.findOne();
        if (sampleProject) {
            console.log("\n2. SCHEMA CHECK - Here is what your DB is actually saving:");
            console.log(JSON.stringify(sampleProject.contributors, null, 2));
        } else {
            console.log("\n2. SCHEMA CHECK - ❌ WARNING: Your CommunityProject collection is completely EMPTY!");
        }

        // 🕵️ STEP 2: The Ultra-Forgiving Query
      // 🕵️ STEP 2: The Ultra-Forgiving Query
        // 🛡️ THE FIX: Fallback to an empty string if username is missing
        const safeUsername = user.username || "";
        const cleanName = safeUsername.replace(/\.+$/, "");
        
        const openSourceTrophies = await CommunityProject.find({
            $or: [
                { "contributors.userId": user._id },               // Match Object ID
                { "contributors.userId": user._id.toString() },    // Match String ID (Common Bug Fix)
                { "contributors.username": safeUsername },         // 🛡️ Use safeUsername here too
                { "contributors.username": { $regex: new RegExp(`^${cleanName}$`, "i") } } 
            ]
        }).sort({ createdAt: -1 });

        console.log(`\n3. QUERY RESULT: Found ${openSourceTrophies.length} matches.`);
        console.log("====== DEBUGGER COMPLETE ======\n");

        // --- C. STATS & TECH STACK CALCULATION ---
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

            // Calculate Language Stats
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

        // Convert language map to sorted array
        const languages = Object.keys(languageMap).map(lang => ({
            name: lang.toUpperCase(),
            percentage: totalFiles > 0 ? Math.round((languageMap[lang] / totalFiles) * 100) : 0,
            color: getColorForLang(lang)
        })).sort((a, b) => b.percentage - a.percentage).slice(0, 4);

        // Save activity updates
        await user.save();

        // --- D. FINAL RESPONSE ---
        // Ensure keys match the ProfilePage.jsx expectations
        res.json({
            name: user.username,
            username: user.email ? user.email.split('@')[0] : user.username,
            bio: user.bio || "No bio yet",
            joinDate: user.createdAt ? user.createdAt.toISOString().split('T')[0] : "Recent",
            stats: {
                projects: userProjects.length,
                hoursCoded: Math.round(user.hoursCoded || 0), 
                streak: user.streak || 1,
                collaborators: uniqueCollaborators.size,
                shippedCount: deployedProjects.length 
            },
            languages: languages,
            deployedProjects: deployedProjects,
            contributions: openSourceTrophies // ✅ This maps to setOpenSourceContributions
        });

    } catch (err) {
        console.error("❌ Profile Controller Error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// --- 2. Update Activity Hours ---
export const updateUserActivity = async (req, res) => {
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
export const updateUserProfile = async (req, res) => {
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