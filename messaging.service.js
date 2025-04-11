const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const axios = require('axios');

// Service for sending messages via WhatsApp
const sendWhatsAppMessage = async (integration, to, message) => {
  try {
    const { phoneNumberId, accessToken } = integration.credentials;
    
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      messageId: response.data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to send WhatsApp message');
  }
};

// Service for sending messages via Facebook Messenger
const sendFacebookMessage = async (integration, recipientId, message) => {
  try {
    const { pageAccessToken } = integration.credentials;
    
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          access_token: pageAccessToken
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      messageId: response.data.message_id
    };
  } catch (error) {
    console.error('Error sending Facebook message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to send Facebook message');
  }
};

// Service for sending messages via Instagram Messenger
const sendInstagramMessage = async (integration, recipientId, message) => {
  try {
    const { pageAccessToken } = integration.credentials;
    
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          access_token: pageAccessToken
        }
      }
    );
    
    return {
      success: true,
      data: response.data,
      messageId: response.data.message_id
    };
  } catch (error) {
    console.error('Error sending Instagram message:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to send Instagram message');
  }
};

// Protected routes for sending messages
router.use(authenticate);

// Send WhatsApp message
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message, integrationId } = req.body;
    const userId = req.user._id;
    
    if (!to || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: to, message' 
      });
    }
    
    // Find the WhatsApp integration
    const Integration = require('../models/Integration');
    const integration = integrationId 
      ? await Integration.findOne({ _id: integrationId, user: userId })
      : await Integration.findOne({ user: userId, platform: 'whatsapp', status: 'active' });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active WhatsApp integration found' 
      });
    }
    
    // Send the message
    const result = await sendWhatsAppMessage(integration, to, message);
    
    // Log the message
    const Conversation = require('../models/Conversation');
    await Conversation.create({
      user: userId,
      integration: integration._id,
      platform: 'whatsapp',
      contact: to,
      direction: 'outbound',
      content: message,
      messageId: result.messageId,
      status: 'sent'
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      message: 'WhatsApp message sent successfully'
    });
    
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error sending WhatsApp message' 
    });
  }
});

// Send Facebook Messenger message
router.post('/facebook/send', async (req, res) => {
  try {
    const { recipientId, message, integrationId } = req.body;
    const userId = req.user._id;
    
    if (!recipientId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: recipientId, message' 
      });
    }
    
    // Find the Facebook integration
    const Integration = require('../models/Integration');
    const integration = integrationId 
      ? await Integration.findOne({ _id: integrationId, user: userId })
      : await Integration.findOne({ user: userId, platform: 'facebook', status: 'active' });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Facebook integration found' 
      });
    }
    
    // Send the message
    const result = await sendFacebookMessage(integration, recipientId, message);
    
    // Log the message
    const Conversation = require('../models/Conversation');
    await Conversation.create({
      user: userId,
      integration: integration._id,
      platform: 'facebook',
      contact: recipientId,
      direction: 'outbound',
      content: message,
      messageId: result.messageId,
      status: 'sent'
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Facebook message sent successfully'
    });
    
  } catch (error) {
    console.error('Facebook send error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error sending Facebook message' 
    });
  }
});

// Send Instagram message
router.post('/instagram/send', async (req, res) => {
  try {
    const { recipientId, message, integrationId } = req.body;
    const userId = req.user._id;
    
    if (!recipientId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: recipientId, message' 
      });
    }
    
    // Find the Instagram integration
    const Integration = require('../models/Integration');
    const integration = integrationId 
      ? await Integration.findOne({ _id: integrationId, user: userId })
      : await Integration.findOne({ user: userId, platform: 'instagram', status: 'active' });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Instagram integration found' 
      });
    }
    
    // Send the message
    const result = await sendInstagramMessage(integration, recipientId, message);
    
    // Log the message
    const Conversation = require('../models/Conversation');
    await Conversation.create({
      user: userId,
      integration: integration._id,
      platform: 'instagram',
      contact: recipientId,
      direction: 'outbound',
      content: message,
      messageId: result.messageId,
      status: 'sent'
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Instagram message sent successfully'
    });
    
  } catch (error) {
    console.error('Instagram send error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error sending Instagram message' 
    });
  }
});

module.exports = {
  router,
  sendWhatsAppMessage,
  sendFacebookMessage,
  sendInstagramMessage
};
