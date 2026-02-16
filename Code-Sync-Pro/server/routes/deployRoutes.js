const express = require('express');
const router = express.Router();
const { deployToGitHub } = require('../controllers/deployController');

// This defines the "door"
router.post('/github', deployToGitHub);

module.exports = router;