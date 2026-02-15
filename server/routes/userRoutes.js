const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Define Routes
router.get('/profile/:userId', userController.getUserProfile);
router.post('/activity', userController.updateUserActivity);
 router.put('/profile/:userId', userController.updateUserProfile);
module.exports = router;