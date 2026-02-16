const axios = require('axios');
const Project = require('../models/Project');

// ✅ HELPER: Check if a file exists on GitHub to get its SHA (Prevents 422 Error)
const getShaIfExists = async (owner, repo, path, token) => {
    try {
        const res = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            { headers: { Authorization: `token ${token}` } }
        );
        return res.data.sha; // Return existing file's SHA
    } catch (err) {
        return null; // File doesn't exist yet
    }
};

exports.deployToGitHub = async (req, res) => {
    const { title, desc, code, language, isPrivate, roomId } = req.body; 
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ 
            success: false, 
            error: "GITHUB_TOKEN is not defined in server .env" 
        });
    }

    try {
        const repoName = title.replace(/\s+/g, '-').toLowerCase();

        // --- Step 1: Create Repository (or find existing) ---
        let owner;
        let repoUrl;

        try {
            const createRepoRes = await axios.post(
                'https://api.github.com/user/repos',
                {
                    name: repoName,
                    description: desc || "Shipped via CodeSync Pro 🚀",
                    private: isPrivate,
                    auto_init: false 
                },
                { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
            );
            owner = createRepoRes.data.owner.login;
            repoUrl = createRepoRes.data.html_url;
        } catch (err) {
            // If repo exists (422), we fetch the user login to continue updates
            if (err.response && err.response.status === 422) {
                const userRes = await axios.get('https://api.github.com/user', {
                    headers: { Authorization: `token ${GITHUB_TOKEN}` }
                });
                owner = userRes.data.login;
                repoUrl = `https://github.com/${owner}/${repoName}`;
            } else {
                throw err;
            }
        }

        // --- Step 2: Generate README.md ---
        const readmeContent = `
# ${title}

${desc || "A collaborative project created and shipped using CodeSync Pro."}

## 🚀 Project Details
- **Language:** ${language.toUpperCase()}
- **Environment:** CodeSync Cloud
- **Status:** Deployed 🚢

## 🛠️ Getting Started
Find the main logic in the \`${language === 'python' ? 'main.py' : language === 'cpp' ? 'main.cpp' : 'index.js'}\` file.

---
*Created with ❤️ by CodeSync Pro*
        `.trim();

        const readmeSha = await getShaIfExists(owner, repoName, 'README.md', GITHUB_TOKEN);

        await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`,
            {
                message: "docs: update README.md 📝",
                content: Buffer.from(readmeContent).toString('base64'),
                sha: readmeSha 
            },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );

        // --- Step 3: Push Main Source Code ---
        const fileName = language === 'python' ? 'main.py' : 
                         language === 'cpp' ? 'main.cpp' : 'index.js';
        
        const fileContent = Buffer.from(code).toString('base64');
        const codeSha = await getShaIfExists(owner, repoName, fileName, GITHUB_TOKEN);

        await axios.put(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${fileName}`,
            {
                message: "feat: update source code 🚀",
                content: fileContent,
                sha: codeSha 
            },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );

        // --- Step 4: Update MongoDB (DEBUG VERSION) ---
        if (roomId) {
            console.log("-----------------------------------------");
            console.log("🔍 DEBUG: Deployment Success, now syncing to DB...");
            console.log("📌 Target RoomID:", roomId);
            console.log("🔗 GitHub URL to save:", repoUrl);

            try {
                const updatedProject = await Project.findOneAndUpdate(
                    { roomId: roomId },
                    { githubUrl: repoUrl },
                    { new: true, runValidators: true } 
                );

                if (updatedProject) {
                    console.log("✅ DATABASE SUCCESS: Project updated!");
                    console.log("💾 Saved githubUrl:", updatedProject.githubUrl);
                } else {
                    console.error("❌ DATABASE ERROR: No project found with this RoomID in the DB.");
                    console.log("💡 Tip: Ensure the project exists in MongoDB before deploying.");
                }
            } catch (dbErr) {
                console.error("❌ MONGOOSE ERROR:", dbErr.message);
            }
            console.log("-----------------------------------------");
        } else {
            console.error("⚠️ CRITICAL: No RoomID received in req.body. Update skipped.");
        }

        // Send Final Success Response to Frontend
        res.status(200).json({
            success: true,
            repoUrl: repoUrl
        });

    } catch (err) {
        console.error("❌ GLOBAL CATCH ERROR:", err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            error: err.response?.data?.message || "Deployment failed" 
        });
    }
};