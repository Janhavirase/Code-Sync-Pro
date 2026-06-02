import express from 'express';
const router = express.Router();
import { getUserProfile, updateUserActivity, updateUserProfile } from '../controllers/userController.js';// Define Routes
router.get('/profile/:userId',getUserProfile);
router.post('/activity',updateUserActivity);
 router.put('/profile/:userId',updateUserProfile);
export default router;