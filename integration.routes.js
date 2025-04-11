const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const integrationController = require('../controllers/integration.controller');

// All routes require authentication
router.use(authenticate);

// Integration routes
router.post('/', integrationController.createIntegrationValidation, integrationController.createIntegration);
router.get('/', integrationController.getIntegrations);
router.get('/:id', integrationController.getIntegrationById);
router.put('/:id', integrationController.updateIntegrationValidation, integrationController.updateIntegration);
router.delete('/:id', integrationController.deleteIntegration);

module.exports = router;
