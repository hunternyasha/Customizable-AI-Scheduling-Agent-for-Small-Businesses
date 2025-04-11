const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const messageTemplateController = require('../controllers/messageTemplate.controller');

// All routes require authentication
router.use(authenticate);

// Message Template routes
router.post('/', messageTemplateController.createMessageTemplateValidation, messageTemplateController.createMessageTemplate);
router.get('/', messageTemplateController.getMessageTemplates);
router.get('/:id', messageTemplateController.getMessageTemplateById);
router.put('/:id', messageTemplateController.updateMessageTemplateValidation, messageTemplateController.updateMessageTemplate);
router.delete('/:id', messageTemplateController.deleteMessageTemplate);

module.exports = router;
