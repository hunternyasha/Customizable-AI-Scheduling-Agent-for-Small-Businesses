const express = require('express');
const router = express.Router();

// Import all service routers
const webhookRoutes = require('./webhook.routes');
const { router: messagingRoutes } = require('../services/messaging.service');
const { router: workflowRoutes } = require('../services/workflow.service');
const { router: googleCalendarRoutes } = require('../services/google-calendar.service');
const { router: emailRoutes } = require('../services/email.service');

// Mount service routes
router.use('/webhooks', webhookRoutes);
router.use('/messaging', messagingRoutes);
router.use('/workflows', workflowRoutes);
router.use('/google-calendar', googleCalendarRoutes);
router.use('/email', emailRoutes);

module.exports = router;
