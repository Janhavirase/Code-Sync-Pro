const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure you have a User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const CommunityProject = require('../models/CommunityProject'); // Make sure this is imported!
// REGISTER ROUTE
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 1. Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // 2. Create new user
        user = new User({ username, email, password });
        
        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        
        await user.save();

        // 4. Create Token
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 3600 }, 
        (err, token) => {
            if (err) throw err;
            // ✅ CRITICAL: Send the User Object back!
            res.json({ 
                token, 
                user: { _id: user.id, username: user.username, email: user.email,role: user.role } 
            });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: 3600 }, 
        (err, token) => {
            if (err) throw err;
            // ✅ CRITICAL: Send the User Object back!
            res.json({ 
                token, 
                user: { _id: user.id, username: user.username, email: user.email,role: user.role } 
            });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// UPDATE PASSWORD ROUTE (Secure)
router.put('/update-password', async (req, res) => {
    // Note: In a fully strict production app, you would get userId from a JWT middleware (e.g., req.user.id).
    // For now, we accept it from the secure frontend payload.
    const { userId, currentPassword, newPassword } = req.body;

    try {
        // 1. Find the user in the database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // 2. Verify the current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect current password. Please try again.' });
        }

        // 3. Hash the NEW password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // 4. Save the updated user
        await user.save();

        res.json({ msg: 'Password updated successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// 🌍 GET PUBLIC PROFILE BY USERNAME
// 🌍 GET PUBLIC PROFILE BY USERNAME
// 🌍 GET PUBLIC PROFILE BY USERNAME (With Name Fallback)
// 🌍 SMART PUBLIC PROFILE LOOKUP
// 🌍 SMART PUBLIC PROFILE LOOKUP
// 🌍 SMART PUBLIC PROFILE LOOKUP (FINAL VERSION)
router.get('/profile/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        let user;

        // 1. Find the User first
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(identifier).select('-password -email');
        }

        if (!user) {
            const cleanName = identifier.replace(/\.+$/, "");
            user = await User.findOne({ 
                username: { $regex: new RegExp(`^${cleanName}$`, "i") } 
            }).select('-password -email');
        }

        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. ✨ THE HYBRID SEARCH: Find projects by ID OR by Username
        // This ensures old "name-only" contributions still show up!
        const contributedProjects = await CommunityProject.find({
            $or: [
                { "contributors.userId": user._id },
                { "contributors.username": user.username },
                { "contributors.username": { $regex: new RegExp(`^${user.username}$`, "i") } }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({
            profile: user,
            contributions: contributedProjects 
        });

    } catch (err) {
        console.error("🔥 Profile Fetch Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
module.exports = router;