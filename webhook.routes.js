const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { Integration } = require('../models');
const axios = require('axios');

// Meta Webhook verification endpoint
router.get('/meta', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Find the integration with this verify token
    const integration = await Integration.findOne({ 
      'settings.verifyToken': token,
      platform: { $in: ['whatsapp', 'facebook', 'instagram'] }
    });

    if (!integration || mode !== 'subscribe') {
      return res.status(403).json({ success: false, message: 'Verification failed' });
    }

    // Verification successful
    console.log('Webhook verified for integration:', integration.name);
    return res.status(200).send(challenge);
  } catch (error) {
    console.error('Meta webhook verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error during webhook verification' });
  }
});

// Meta Webhook event handling endpoint
router.post('/meta', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body;
    
    // Immediately respond to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
    
    // Process the webhook asynchronously
    processMetaWebhook(signature, payload);
  } catch (error) {
    console.error('Meta webhook processing error:', error);
    // Still return 200 to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
  }
});

// Function to process Meta webhook events asynchronously
async function processMetaWebhook(signature, payload) {
  try {
    // Determine the platform (WhatsApp, Facebook, Instagram)
    let platform = 'unknown';
    let userId = null;
    let pageId = null;
    let messageData = null;
    
    if (payload.object === 'whatsapp_business_account') {
      platform = 'whatsapp';
      // Extract WhatsApp-specific data
      if (payload.entry && payload.entry.length > 0) {
        const entry = payload.entry[0];
        if (entry.changes && entry.changes.length > 0) {
          const change = entry.changes[0];
          if (change.value && change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            userId = message.from;
            messageData = {
              id: message.id,
              timestamp: message.timestamp,
              from: message.from,
              type: message.type,
              text: message.text?.body,
              // Add other message types as needed
            };
          }
        }
      }
    } else if (payload.object === 'page' || payload.object === 'instagram') {
      platform = payload.object === 'page' ? 'facebook' : 'instagram';
      // Extract Facebook/Instagram-specific data
      if (payload.entry && payload.entry.length > 0) {
        const entry = payload.entry[0];
        pageId = entry.id;
        
        if (entry.messaging && entry.messaging.length > 0) {
          const messaging = entry.messaging[0];
          userId = messaging.sender.id;
          
          if (messaging.message) {
            messageData = {
              id: messaging.message.mid,
              timestamp: messaging.timestamp,
              from: messaging.sender.id,
              type: messaging.message.text ? 'text' : 'other',
              text: messaging.message.text,
              // Add other message types as needed
            };
          }
        }
      }
    }
    
    if (!messageData) {
      console.log('No message data found in webhook payload');
      return;
    }
    
    // Find the integration for this platform
    const integration = await Integration.findOne({ 
      platform,
      status: 'active'
    });
    
    if (!integration) {
      console.log(`No active integration found for platform: ${platform}`);
      return;
    }
    
    // Process the message based on the platform
    await processMessage(platform, integration, userId, pageId, messageData);
    
  } catch (error) {
    console.error('Error processing Meta webhook:', error);
  }
}

// Function to process messages from different platforms
async function processMessage(platform, integration, userId, pageId, messageData) {
  try {
    // Log the incoming message
    console.log(`Processing ${platform} message from ${userId}:`, messageData);
    
    // TODO: Implement workflow triggering based on message content
    // This would involve finding applicable workflows and executing them
    
    // For now, just send a simple response
    await sendResponse(platform, integration, userId, pageId, messageData);
    
  } catch (error) {
    console.error(`Error processing ${platform} message:`, error);
  }
}

// Function to send responses to different platforms
async function sendResponse(platform, integration, userId, pageId, messageData) {
  try {
    const credentials = integration.credentials;
    
    if (platform === 'whatsapp') {
      // Send WhatsApp response
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/${credentials.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: userId,
          type: 'text',
          text: { body: 'Thank you for your message! Our scheduling agent will assist you shortly.' }
        },
        {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('WhatsApp response sent:', response.data);
      
    } else if (platform === 'facebook') {
      // Send Facebook Messenger response
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/me/messages`,
        {
          recipient: { id: userId },
          message: { text: 'Thank you for your message! Our scheduling agent will assist you shortly.' }
        },
        {
          headers: {
            'Authorization': `Bearer ${credentials.pageAccessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            access_token: credentials.pageAccessToken
          }
        }
      );
      
      console.log('Facebook response sent:', response.data);
      
    } else if (platform === 'instagram') {
      // Send Instagram response (similar to Facebook)
      const response = await axios.post(
        `https://graph.facebook.com/v17.0/me/messages`,
        {
          recipient: { id: userId },
          message: { text: 'Thank you for your message! Our scheduling agent will assist you shortly.' }
        },
        {
          headers: {
            'Authorization': `Bearer ${credentials.pageAccessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            access_token: credentials.pageAccessToken
          }
        }
      );
      
      console.log('Instagram response sent:', response.data);
    }
    
  } catch (error) {
    console.error(`Error sending ${platform} response:`, error);
  }
}

// Protected routes for managing Meta integrations
router.use(authenticate);

// Connect WhatsApp Business API
router.post('/connect/whatsapp', async (req, res) => {
  try {
    const { phoneNumberId, accessToken, businessAccountId, verifyToken } = req.body;
    const userId = req.user._id;
    
    // Validate required fields
    if (!phoneNumberId || !accessToken || !businessAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: phoneNumberId, accessToken, businessAccountId' 
      });
    }
    
    // Check if WhatsApp integration already exists
    const existingIntegration = await Integration.findOne({ 
      user: userId,
      platform: 'whatsapp'
    });
    
    if (existingIntegration) {
      return res.status(400).json({ 
        success: false, 
        message: 'WhatsApp integration already exists. Please update the existing integration.' 
      });
    }
    
    // Generate webhook verify token if not provided
    const webhookVerifyToken = verifyToken || crypto.randomBytes(32).toString('hex');
    
    // Create new WhatsApp integration
    const integration = new Integration({
      user: userId,
      platform: 'whatsapp',
      name: 'WhatsApp Business',
      credentials: {
        phoneNumberId,
        accessToken,
        businessAccountId
      },
      settings: {
        verifyToken: webhookVerifyToken
      },
      status: 'active'
    });
    
    await integration.save();
    
    // Return success with webhook information
    const webhookUrl = `${process.env.API_BASE_URL}/api/webhooks/meta`;
    
    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    
    res.status(201).json({
      success: true,
      data: {
        integration: responseIntegration,
        webhookInfo: {
          url: webhookUrl,
          verifyToken: webhookVerifyToken
        }
      },
      message: 'WhatsApp integration created successfully'
    });
    
  } catch (error) {
    console.error('WhatsApp integration error:', error);
    res.status(500).json({ success: false, message: 'Server error creating WhatsApp integration' });
  }
});

// Connect Facebook Messenger API
router.post('/connect/facebook', async (req, res) => {
  try {
    const { pageId, pageAccessToken, appId, appSecret, verifyToken } = req.body;
    const userId = req.user._id;
    
    // Validate required fields
    if (!pageId || !pageAccessToken || !appId || !appSecret) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: pageId, pageAccessToken, appId, appSecret' 
      });
    }
    
    // Check if Facebook integration already exists
    const existingIntegration = await Integration.findOne({ 
      user: userId,
      platform: 'facebook'
    });
    
    if (existingIntegration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facebook integration already exists. Please update the existing integration.' 
      });
    }
    
    // Generate webhook verify token if not provided
    const webhookVerifyToken = verifyToken || crypto.randomBytes(32).toString('hex');
    
    // Create new Facebook integration
    const integration = new Integration({
      user: userId,
      platform: 'facebook',
      name: 'Facebook Messenger',
      credentials: {
        pageId,
        pageAccessToken,
        appId,
        appSecret
      },
      settings: {
        verifyToken: webhookVerifyToken
      },
      status: 'active'
    });
    
    await integration.save();
    
    // Return success with webhook information
    const webhookUrl = `${process.env.API_BASE_URL}/api/webhooks/meta`;
    
    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    
    res.status(201).json({
      success: true,
      data: {
        integration: responseIntegration,
        webhookInfo: {
          url: webhookUrl,
          verifyToken: webhookVerifyToken
        }
      },
      message: 'Facebook integration created successfully'
    });
    
  } catch (error) {
    console.error('Facebook integration error:', error);
    res.status(500).json({ success: false, message: 'Server error creating Facebook integration' });
  }
});

// Connect Instagram Messenger API
router.post('/connect/instagram', async (req, res) => {
  try {
    const { instagramAccountId, pageAccessToken, appId, appSecret, verifyToken } = req.body;
    const userId = req.user._id;
    
    // Validate required fields
    if (!instagramAccountId || !pageAccessToken || !appId || !appSecret) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: instagramAccountId, pageAccessToken, appId, appSecret' 
      });
    }
    
    // Check if Instagram integration already exists
    const existingIntegration = await Integration.findOne({ 
      user: userId,
      platform: 'instagram'
    });
    
    if (existingIntegration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Instagram integration already exists. Please update the existing integration.' 
      });
    }
    
    // Generate webhook verify token if not provided
    const webhookVerifyToken = verifyToken || crypto.randomBytes(32).toString('hex');
    
    // Create new Instagram integration
    const integration = new Integration({
      user: userId,
      platform: 'instagram',
      name: 'Instagram Messenger',
      credentials: {
        instagramAccountId,
        pageAccessToken,
        appId,
        appSecret
      },
      settings: {
        verifyToken: webhookVerifyToken
      },
      status: 'active'
    });
    
    await integration.save();
    
    // Return success with webhook information
    const webhookUrl = `${process.env.API_BASE_URL}/api/webhooks/meta`;
    
    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    
    res.status(201).json({
      success: true,
      data: {
        integration: responseIntegration,
        webhookInfo: {
          url: webhookUrl,
          verifyToken: webhookVerifyToken
        }
      },
      message: 'Instagram integration created successfully'
    });
    
  } catch (error) {
    console.error('Instagram integration error:', error);
    res.status(500).json({ success: false, message: 'Server error creating Instagram integration' });
  }
});

module.exports = router;
