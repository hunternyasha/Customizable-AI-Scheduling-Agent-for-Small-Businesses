const express = require('express');
const { body, validationResult } = require('express-validator');
const { Integration } = require('../models');

// Create a new integration
const createIntegration = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { platform, name, credentials, settings } = req.body;
    const userId = req.user._id;

    // Check if integration already exists for this platform
    const existingIntegration = await Integration.findOne({ user: userId, platform });
    if (existingIntegration) {
      return res.status(400).json({ 
        success: false, 
        message: `Integration for ${platform} already exists. Please update the existing integration.` 
      });
    }

    // Create new integration
    const integration = new Integration({
      user: userId,
      platform,
      name,
      credentials,
      settings: settings || {},
      status: 'pending'
    });

    await integration.save();

    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    delete responseIntegration.webhookSecret;

    res.status(201).json({
      success: true,
      data: {
        integration: responseIntegration
      }
    });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ success: false, message: 'Server error creating integration' });
  }
};

// Get all integrations for a user
const getIntegrations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { platform } = req.query;

    // Build query
    const query = { user: userId };
    
    // Add platform filter if provided
    if (platform) {
      query.platform = platform;
    }

    const integrations = await Integration.find(query).sort({ platform: 1 });

    // Remove sensitive data from response
    const responseIntegrations = integrations.map(integration => {
      const integrationObj = integration.toObject();
      delete integrationObj.credentials;
      delete integrationObj.webhookSecret;
      return integrationObj;
    });

    res.json({
      success: true,
      data: {
        integrations: responseIntegrations
      }
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving integrations' });
  }
};

// Get a single integration by ID
const getIntegrationById = async (req, res) => {
  try {
    const integrationId = req.params.id;
    const userId = req.user._id;

    const integration = await Integration.findOne({ _id: integrationId, user: userId });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    delete responseIntegration.webhookSecret;

    res.json({
      success: true,
      data: {
        integration: responseIntegration
      }
    });
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving integration' });
  }
};

// Update an integration
const updateIntegration = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const integrationId = req.params.id;
    const userId = req.user._id;
    const { name, credentials, settings, status } = req.body;

    // Find integration
    const integration = await Integration.findOne({ _id: integrationId, user: userId });
    
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    // Update fields
    if (name) integration.name = name;
    if (credentials) integration.credentials = credentials;
    if (settings) integration.settings = { ...integration.settings, ...settings };
    if (status) integration.status = status;

    // Reset error count if status is being changed from error
    if (status && status !== 'error' && integration.status === 'error') {
      integration.errorCount = 0;
      integration.errorMessage = null;
    }

    await integration.save();

    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    delete responseIntegration.webhookSecret;

    res.json({
      success: true,
      data: {
        integration: responseIntegration
      }
    });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ success: false, message: 'Server error updating integration' });
  }
};

// Delete an integration
const deleteIntegration = async (req, res) => {
  try {
    const integrationId = req.params.id;
    const userId = req.user._id;

    const integration = await Integration.findOneAndDelete({ _id: integrationId, user: userId });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting integration' });
  }
};

// Validation rules
const createIntegrationValidation = [
  body('platform').isIn(['whatsapp', 'facebook', 'instagram', 'google_calendar', 'email']).withMessage('Platform must be valid'),
  body('name').notEmpty().withMessage('Name is required'),
  body('credentials').isObject().withMessage('Credentials must be an object'),
  body('settings').optional().isObject().withMessage('Settings must be an object')
];

const updateIntegrationValidation = [
  body('name').optional().notEmpty().withMessage('Name is required'),
  body('credentials').optional().isObject().withMessage('Credentials must be an object'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'error']).withMessage('Status must be valid')
];

module.exports = {
  createIntegration,
  getIntegrations,
  getIntegrationById,
  updateIntegration,
  deleteIntegration,
  createIntegrationValidation,
  updateIntegrationValidation
};
