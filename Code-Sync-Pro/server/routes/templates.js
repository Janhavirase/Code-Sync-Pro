const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.post('/', templateController.createTemplate);
router.get('/', templateController.getTemplates); // usage: /api/templates?userId=123
router.delete('/:templateId', templateController.deleteTemplate);

module.exports = router;