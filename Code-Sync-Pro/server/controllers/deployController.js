import axios from 'axios';
import Project from '../models/Project.js';

// ✅ HELPER: Check if a file exists on GitHub to get its SHA (prevents 422 errors)
const getShaIfExists = async (owner, repo, path, token) => {
    try {
        const res = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data.sha;
    } catch (err) {
        return null;
    }
};

export const deployToGitHub = async (req, res) => {
    const { title, desc, isPrivate, roomId, files } = req.body;
    const authHeader = req.headers.authorization;
    const GITHUB_TOKEN = authHeader?.split(' ')[1];

    if (!GITHUB_TOKEN) {
        // ✨ NEW: Save exactly where they are right now (e.g., "/editor/29bdfe96-...")
        localStorage.setItem('returnPath', window.location.pathname);
        return res.status(401).json({ success: false, error: "Missing GitHub Token" });
    }

    try {
        const repoName = title.replace(/\s+/g, '-').toLowerCase();
        let owner;
        let repoUrl;

        // --- STEP 1: Create or Identify Repository ---
        try {
            const createRepoRes = await axios.post(
                'https://api.github.com/user/repos',
                { name: repoName, description: desc, private: isPrivate, auto_init: true },
                { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
            );
            owner = createRepoRes.data.owner.login;
            repoUrl = createRepoRes.data.html_url;
            console.log(`✅ Repository Ready: ${repoUrl}`);
        } catch (err) {
            if (err.response?.status === 422) {
                const userRes = await axios.get('https://api.github.com/user', {
                    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
                });
                owner = userRes.data.login;
                repoUrl = `https://github.com/${owner}/${repoName}`;
                console.log("ℹ️ Using existing repository.");
            } else throw err;
        }

        // --- STEP 2: Generate & Push README.md ---
        const displayLang = files && files.length > 0 ? files[0].language : "javascript";
        const readmeContent = `
# ${title}
${desc || "A collaborative project created and shipped using CodeSync Pro."}

## 🚀 Project Details
- **Primary Language:** ${displayLang.toUpperCase()}
- **Status:** Deployed 🚢

---
*Created with ❤️ by CodeSync Pro*`.trim();

        const readmeSha = await getShaIfExists(owner, repoName, 'README.md', GITHUB_TOKEN);
        await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`,
            {
                message: "docs: update README.md 📝",
                content: Buffer.from(readmeContent).toString('base64'),
                sha: readmeSha
            },
            { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
        );

        // --- STEP 3: Push All Project Files ---
        if (files && Array.isArray(files)) {
            for (const file of files) {
                // We only push items that have a value (skips empty folders)
                if (file.value !== null && file.value !== undefined) {
                    const fileSha = await getShaIfExists(owner, repoName, file.name, GITHUB_TOKEN);
                    await axios.put(
                        `https://api.github.com/repos/${owner}/${repoName}/contents/${file.name}`,
                        {
                            message: `feat: sync ${file.name} 🚀`,
                            content: Buffer.from(file.value).toString('base64'),
                            sha: fileSha
                        },
                        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
                    );
                    console.log(`   📄 Pushed: ${file.name}`);
                }
            }
        }

        // --- STEP 4: Sync to MongoDB ---
        if (roomId) {
            console.log("-----------------------------------------");
            console.log("🔍 DB DEBUG: Searching for RoomID:", roomId);
            try {
                // Fetch samples to diagnose potential ID mismatches
                const samples = await Project.find({}).limit(5).select('roomId');
                console.log("📋 Current IDs in DB:", samples.map(p => p.roomId));

                const updatedProject = await Project.findOneAndUpdate(
                    { roomId: roomId.trim() },
                    { githubUrl: repoUrl },
                    { new: true, runValidators: true }
                );

                if (updatedProject) {
                    console.log("✅ DB SUCCESS: Project record updated.");
                } else {
                    console.warn("❌ DB ERROR: RoomID not found. Check if project was saved on creation.");
                }
            } catch (dbErr) {
                console.error("❌ MONGOOSE ERROR:", dbErr.message);
            }
            console.log("-----------------------------------------");
        }

        // Success Response
        res.status(200).json({ success: true, repoUrl });

    } catch (err) {
        console.error("❌ GLOBAL ERROR:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: err.response?.data?.message || "Deployment failed"
        });
    }
};