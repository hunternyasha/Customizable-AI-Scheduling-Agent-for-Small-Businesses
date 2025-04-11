const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const workflowController = require('../controllers/workflow.controller');

// All routes require authentication
router.use(authenticate);

// Workflow routes
router.post('/', workflowController.createWorkflowValidation, workflowController.createWorkflow);
router.get('/', workflowController.getWorkflows);
router.get('/:id', workflowController.getWorkflowById);
router.put('/:id', workflowController.updateWorkflowValidation, workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

module.exports = router;
