const express = require('express');
const { body, validationResult } = require('express-validator');
const { Workflow } = require('../models');

// Create a new workflow
const createWorkflow = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, type, triggers, actions, n8nWorkflowData } = req.body;
    const userId = req.user._id;

    // Create new workflow
    const workflow = new Workflow({
      user: userId,
      name,
      description,
      type,
      triggers: triggers || [],
      actions: actions || [],
      n8nWorkflowData: n8nWorkflowData || null
    });

    await workflow.save();

    res.status(201).json({
      success: true,
      data: {
        workflow
      }
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error creating workflow' });
  }
};

// Get all workflows for a user
const getWorkflows = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, active } = req.query;

    // Build query
    const query = { user: userId };
    
    // Add type filter if provided
    if (type) {
      query.type = type;
    }
    
    // Add active filter if provided
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const workflows = await Workflow.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: {
        workflows
      }
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving workflows' });
  }
};

// Get a single workflow by ID
const getWorkflowById = async (req, res) => {
  try {
    const workflowId = req.params.id;
    const userId = req.user._id;

    const workflow = await Workflow.findOne({ _id: workflowId, user: userId });

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    res.json({
      success: true,
      data: {
        workflow
      }
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving workflow' });
  }
};

// Update a workflow
const updateWorkflow = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const workflowId = req.params.id;
    const userId = req.user._id;
    const { name, description, type, triggers, actions, n8nWorkflowData, active, n8nWorkflowId } = req.body;

    // Find workflow and update
    const updatedWorkflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, user: userId },
      {
        $set: {
          name,
          description,
          type,
          triggers,
          actions,
          n8nWorkflowData,
          active: active !== undefined ? active : true,
          n8nWorkflowId
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedWorkflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    res.json({
      success: true,
      data: {
        workflow: updatedWorkflow
      }
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error updating workflow' });
  }
};

// Delete a workflow
const deleteWorkflow = async (req, res) => {
  try {
    const workflowId = req.params.id;
    const userId = req.user._id;

    const workflow = await Workflow.findOneAndDelete({ _id: workflowId, user: userId });

    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting workflow' });
  }
};

// Validation rules
const createWorkflowValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['messaging', 'scheduling', 'reminder', 'notification', 'custom']).withMessage('Type must be valid'),
  body('description').optional(),
  body('triggers').isArray().withMessage('Triggers must be an array'),
  body('triggers.*.event').isIn(['message_received', 'appointment_created', 'appointment_reminder', 'appointment_cancelled', 'custom']).withMessage('Trigger event must be valid'),
  body('triggers.*.conditions').optional().isArray().withMessage('Conditions must be an array'),
  body('actions').isArray().withMessage('Actions must be an array'),
  body('actions.*.type').isIn(['send_message', 'create_appointment', 'update_appointment', 'send_email', 'webhook', 'custom']).withMessage('Action type must be valid'),
  body('actions.*.config').optional().isObject().withMessage('Action config must be an object'),
  body('n8nWorkflowData').optional()
];

const updateWorkflowValidation = [
  body('name').optional().notEmpty().withMessage('Name is required'),
  body('type').optional().isIn(['messaging', 'scheduling', 'reminder', 'notification', 'custom']).withMessage('Type must be valid'),
  body('description').optional(),
  body('triggers').optional().isArray().withMessage('Triggers must be an array'),
  body('triggers.*.event').optional().isIn(['message_received', 'appointment_created', 'appointment_reminder', 'appointment_cancelled', 'custom']).withMessage('Trigger event must be valid'),
  body('triggers.*.conditions').optional().isArray().withMessage('Conditions must be an array'),
  body('actions').optional().isArray().withMessage('Actions must be an array'),
  body('actions.*.type').optional().isIn(['send_message', 'create_appointment', 'update_appointment', 'send_email', 'webhook', 'custom']).withMessage('Action type must be valid'),
  body('actions.*.config').optional().isObject().withMessage('Action config must be an object'),
  body('n8nWorkflowData').optional(),
  body('n8nWorkflowId').optional(),
  body('active').optional().isBoolean().withMessage('Active must be a boolean')
];

module.exports = {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  createWorkflowValidation,
  updateWorkflowValidation
};
