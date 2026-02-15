const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure you have a User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = router;