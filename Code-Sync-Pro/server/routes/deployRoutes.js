import express from 'express';
const router = express.Router();
import { deployToGitHub } from '../controllers/deployController.js';
// This defines the "door"
router.post('/github', deployToGitHub);

export default router;