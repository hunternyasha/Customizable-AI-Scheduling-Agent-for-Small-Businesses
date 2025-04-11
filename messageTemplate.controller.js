const express = require('express');
const { body, validationResult } = require('express-validator');
const { MessageTemplate } = require('../models');

// Create a new message template
const createMessageTemplate = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, type, platform, subject, content, variables } = req.body;
    const userId = req.user._id;

    // Create new message template
    const messageTemplate = new MessageTemplate({
      user: userId,
      name,
      type,
      platform,
      subject,
      content,
      variables: variables || []
    });

    await messageTemplate.save();

    res.status(201).json({
      success: true,
      data: {
        messageTemplate
      }
    });
  } catch (error) {
    console.error('Create message template error:', error);
    res.status(500).json({ success: false, message: 'Server error creating message template' });
  }
};

// Get all message templates for a user
const getMessageTemplates = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, platform } = req.query;

    // Build query
    const query = { user: userId };
    
    // Add type filter if provided
    if (type) {
      query.type = type;
    }
    
    // Add platform filter if provided
    if (platform) {
      query.platform = platform;
    }

    const messageTemplates = await MessageTemplate.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: {
        messageTemplates
      }
    });
  } catch (error) {
    console.error('Get message templates error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving message templates' });
  }
};

// Get a single message template by ID
const getMessageTemplateById = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.user._id;

    const messageTemplate = await MessageTemplate.findOne({ _id: templateId, user: userId });

    if (!messageTemplate) {
      return res.status(404).json({ success: false, message: 'Message template not found' });
    }

    res.json({
      success: true,
      data: {
        messageTemplate
      }
    });
  } catch (error) {
    console.error('Get message template error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving message template' });
  }
};

// Update a message template
const updateMessageTemplate = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const templateId = req.params.id;
    const userId = req.user._id;
    const { name, type, platform, subject, content, variables, active } = req.body;

    // Find message template and update
    const updatedMessageTemplate = await MessageTemplate.findOneAndUpdate(
      { _id: templateId, user: userId },
      {
        $set: {
          name,
          type,
          platform,
          subject,
          content,
          variables,
          active: active !== undefined ? active : true
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedMessageTemplate) {
      return res.status(404).json({ success: false, message: 'Message template not found' });
    }

    res.json({
      success: true,
      data: {
        messageTemplate: updatedMessageTemplate
      }
    });
  } catch (error) {
    console.error('Update message template error:', error);
    res.status(500).json({ success: false, message: 'Server error updating message template' });
  }
};

// Delete a message template
const deleteMessageTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.user._id;

    const messageTemplate = await MessageTemplate.findOneAndDelete({ _id: templateId, user: userId });

    if (!messageTemplate) {
      return res.status(404).json({ success: false, message: 'Message template not found' });
    }

    res.json({
      success: true,
      message: 'Message template deleted successfully'
    });
  } catch (error) {
    console.error('Delete message template error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting message template' });
  }
};

// Validation rules
const createMessageTemplateValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['confirmation', 'reminder', 'cancellation', 'reschedule', 'follow-up', 'custom']).withMessage('Type must be valid'),
  body('platform').isIn(['email', 'whatsapp', 'facebook', 'instagram', 'all']).withMessage('Platform must be valid'),
  body('subject').optional(),
  body('content').notEmpty().withMessage('Content is required'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
  body('variables.*.name').optional().isString().withMessage('Variable name must be a string'),
  body('variables.*.description').optional().isString().withMessage('Variable description must be a string')
];

const updateMessageTemplateValidation = [
  body('name').optional().notEmpty().withMessage('Name is required'),
  body('type').optional().isIn(['confirmation', 'reminder', 'cancellation', 'reschedule', 'follow-up', 'custom']).withMessage('Type must be valid'),
  body('platform').optional().isIn(['email', 'whatsapp', 'facebook', 'instagram', 'all']).withMessage('Platform must be valid'),
  body('subject').optional(),
  body('content').optional().notEmpty().withMessage('Content is required'),
  body('variables').optional().isArray().withMessage('Variables must be an array'),
  body('variables.*.name').optional().isString().withMessage('Variable name must be a string'),
  body('variables.*.description').optional().isString().withMessage('Variable description must be a string'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean')
];

module.exports = {
  createMessageTemplate,
  getMessageTemplates,
  getMessageTemplateById,
  updateMessageTemplate,
  deleteMessageTemplate,
  createMessageTemplateValidation,
  updateMessageTemplateValidation
};
