import express from 'express';
const router = express.Router();
import { createTemplate,getTemplates,deleteTemplate} from '../controllers/templateController.js';// Define Routes
router.post('/',createTemplate);
router.get('/', getTemplates); // usage: /api/templates?userId=123
router.delete('/:templateId', deleteTemplate);

export default router;