const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Integration, Workflow, Conversation, Log } = require('../models');
const axios = require('axios');

// Service for processing incoming messages and triggering workflows
const processIncomingMessage = async (platform, userId, messageData, integrationId) => {
  try {
    // Log the incoming message
    const conversation = await Conversation.create({
      user: userId,
      integration: integrationId,
      platform,
      contact: messageData.from,
      direction: 'inbound',
      content: messageData.text,
      messageId: messageData.id,
      status: 'received',
      metadata: {
        timestamp: messageData.timestamp,
        type: messageData.type
      }
    });

    // Find applicable workflows
    const workflows = await Workflow.find({
      user: userId,
      active: true,
      'triggers.event': 'message_received',
      $or: [
        { 'triggers.conditions.platform': platform },
        { 'triggers.conditions.platform': 'all' }
      ]
    });

    if (workflows.length === 0) {
      console.log(`No applicable workflows found for ${platform} message`);
      return {
        success: true,
        message: 'No workflows triggered',
        conversationId: conversation._id
      };
    }

    // Execute each applicable workflow
    const results = [];
    for (const workflow of workflows) {
      try {
        // Check if workflow conditions match
        const matchesConditions = evaluateWorkflowConditions(workflow, platform, messageData);
        
        if (!matchesConditions) {
          continue;
        }

        // Execute workflow actions
        const result = await executeWorkflowActions(workflow, {
          platform,
          userId,
          contact: messageData.from,
          message: messageData.text,
          integrationId,
          conversationId: conversation._id
        });

        results.push({
          workflowId: workflow._id,
          workflowName: workflow.name,
          success: true,
          actions: result
        });

        // Log workflow execution
        await Log.create({
          user: userId,
          type: 'workflow_execution',
          source: platform,
          referenceId: workflow._id,
          referenceModel: 'Workflow',
          status: 'success',
          details: {
            workflowName: workflow.name,
            trigger: 'message_received',
            messageId: messageData.id,
            actions: result
          }
        });
      } catch (error) {
        console.error(`Error executing workflow ${workflow._id}:`, error);
        
        // Log workflow execution error
        await Log.create({
          user: userId,
          type: 'workflow_execution',
          source: platform,
          referenceId: workflow._id,
          referenceModel: 'Workflow',
          status: 'error',
          details: {
            workflowName: workflow.name,
            trigger: 'message_received',
            messageId: messageData.id,
            error: error.message
          }
        });
        
        results.push({
          workflowId: workflow._id,
          workflowName: workflow.name,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: 'Message processed',
      conversationId: conversation._id,
      workflowResults: results
    };
  } catch (error) {
    console.error('Error processing incoming message:', error);
    throw error;
  }
};

// Helper function to evaluate workflow conditions
const evaluateWorkflowConditions = (workflow, platform, messageData) => {
  // Find the message_received trigger
  const trigger = workflow.triggers.find(t => t.event === 'message_received');
  
  if (!trigger || !trigger.conditions || trigger.conditions.length === 0) {
    // If no conditions, the workflow applies to all messages
    return true;
  }
  
  // Check each condition
  for (const condition of trigger.conditions) {
    // Platform condition
    if (condition.platform && condition.platform !== 'all' && condition.platform !== platform) {
      return false;
    }
    
    // Contains text condition
    if (condition.containsText && messageData.text && !messageData.text.toLowerCase().includes(condition.containsText.toLowerCase())) {
      return false;
    }
    
    // Exact match condition
    if (condition.exactMatch && messageData.text !== condition.exactMatch) {
      return false;
    }
    
    // Starts with condition
    if (condition.startsWith && messageData.text && !messageData.text.toLowerCase().startsWith(condition.startsWith.toLowerCase())) {
      return false;
    }
    
    // Regular expression condition
    if (condition.regex && messageData.text) {
      try {
        const regex = new RegExp(condition.regex, 'i');
        if (!regex.test(messageData.text)) {
          return false;
        }
      } catch (error) {
        console.error('Invalid regex in workflow condition:', error);
        return false;
      }
    }
  }
  
  // All conditions passed
  return true;
};

// Helper function to execute workflow actions
const executeWorkflowActions = async (workflow, context) => {
  const { platform, userId, contact, message, integrationId, conversationId } = context;
  const results = [];
  
  // Import messaging service
  const messagingService = require('./messaging.service');
  
  // Execute each action in sequence
  for (const action of workflow.actions) {
    try {
      let result;
      
      switch (action.type) {
        case 'send_message':
          // Get the message content from the action config
          const messageContent = action.config.message || 'Thank you for your message!';
          
          // Send the message using the appropriate service
          if (platform === 'whatsapp') {
            const integration = await Integration.findById(integrationId);
            result = await messagingService.sendWhatsAppMessage(integration, contact, messageContent);
          } else if (platform === 'facebook') {
            const integration = await Integration.findById(integrationId);
            result = await messagingService.sendFacebookMessage(integration, contact, messageContent);
          } else if (platform === 'instagram') {
            const integration = await Integration.findById(integrationId);
            result = await messagingService.sendInstagramMessage(integration, contact, messageContent);
          }
          
          // Log the outbound message
          await Conversation.create({
            user: userId,
            integration: integrationId,
            platform,
            contact,
            direction: 'outbound',
            content: messageContent,
            messageId: result.messageId,
            status: 'sent',
            inReplyTo: conversationId
          });
          
          results.push({
            type: 'send_message',
            success: true,
            messageId: result.messageId
          });
          break;
          
        case 'create_appointment':
          // This would integrate with the appointment creation logic
          // For now, just log that this action would be taken
          console.log('Would create appointment based on message:', message);
          results.push({
            type: 'create_appointment',
            success: true,
            message: 'Appointment creation would be triggered here'
          });
          break;
          
        case 'webhook':
          // Call an external webhook if configured
          if (action.config.url) {
            const webhookResult = await axios.post(action.config.url, {
              platform,
              message,
              contact,
              timestamp: new Date(),
              workflowId: workflow._id,
              workflowName: workflow.name
            });
            
            results.push({
              type: 'webhook',
              success: true,
              statusCode: webhookResult.status
            });
          }
          break;
          
        case 'custom':
          // For custom actions, we would need to integrate with n8n
          // For now, just log that this action would be taken
          console.log('Would execute custom action via n8n:', action.config);
          results.push({
            type: 'custom',
            success: true,
            message: 'Custom action would be triggered via n8n'
          });
          break;
          
        default:
          results.push({
            type: action.type,
            success: false,
            message: `Unsupported action type: ${action.type}`
          });
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      results.push({
        type: action.type,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

// Protected routes for workflow processing
router.use(authenticate);

// Process a message manually (for testing)
router.post('/process-message', async (req, res) => {
  try {
    const { platform, from, text, integrationId } = req.body;
    const userId = req.user._id;
    
    if (!platform || !from || !text) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: platform, from, text' 
      });
    }
    
    // Find the integration if not provided
    let integration;
    if (integrationId) {
      integration = await Integration.findOne({ _id: integrationId, user: userId });
    } else {
      integration = await Integration.findOne({ user: userId, platform, status: 'active' });
    }
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: `No active ${platform} integration found` 
      });
    }
    
    // Create message data object
    const messageData = {
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      from,
      type: 'text',
      text
    };
    
    // Process the message
    const result = await processIncomingMessage(platform, userId, messageData, integration._id);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Message processed successfully'
    });
    
  } catch (error) {
    console.error('Manual message processing error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error processing message' 
    });
  }
});

module.exports = {
  router,
  processIncomingMessage
};
