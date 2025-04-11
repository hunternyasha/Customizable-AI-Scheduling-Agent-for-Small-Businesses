const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Integration, Log, MessageTemplate } = require('../models');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Email Service class
class EmailService {
  constructor(credentials, provider = 'smtp') {
    this.credentials = credentials;
    this.provider = provider;
    
    // Create transporter based on provider
    if (provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure || false,
        auth: {
          user: credentials.user,
          pass: credentials.password
        }
      });
    } else if (provider === 'sendgrid') {
      // For SendGrid, we use their API via axios
      this.apiKey = credentials.apiKey;
    } else if (provider === 'mailgun') {
      // For Mailgun, we use their API via axios
      this.apiKey = credentials.apiKey;
      this.domain = credentials.domain;
    }
  }
  
  // Send email
  async sendEmail(options) {
    try {
      const { from, to, subject, text, html, attachments } = options;
      
      if (this.provider === 'smtp') {
        // Send via SMTP
        const result = await this.transporter.sendMail({
          from: from || this.credentials.defaultFrom,
          to,
          subject,
          text,
          html,
          attachments
        });
        
        return {
          success: true,
          messageId: result.messageId,
          response: result.response
        };
      } else if (this.provider === 'sendgrid') {
        // Send via SendGrid API
        const response = await axios.post(
          'https://api.sendgrid.com/v3/mail/send',
          {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: from || this.credentials.defaultFrom },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        return {
          success: true,
          statusCode: response.status
        };
      } else if (this.provider === 'mailgun') {
        // Send via Mailgun API
        const formData = new URLSearchParams();
        formData.append('from', from || this.credentials.defaultFrom);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('text', text);
        if (html) formData.append('html', html);
        
        const response = await axios.post(
          `https://api.mailgun.net/v3/${this.domain}/messages`,
          formData,
          {
            auth: {
              username: 'api',
              password: this.apiKey
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        return {
          success: true,
          messageId: response.data.id,
          response: response.data.message
        };
      }
      
      throw new Error(`Unsupported email provider: ${this.provider}`);
    } catch (error) {
      console.error(`Error sending email via ${this.provider}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
  
  // Verify connection
  async verifyConnection() {
    try {
      if (this.provider === 'smtp') {
        await this.transporter.verify();
        return { success: true };
      } else if (this.provider === 'sendgrid') {
        // Verify SendGrid API key by making a simple request
        const response = await axios.get(
          'https://api.sendgrid.com/v3/user/credits',
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        return {
          success: true,
          statusCode: response.status
        };
      } else if (this.provider === 'mailgun') {
        // Verify Mailgun API key by making a simple request
        const response = await axios.get(
          `https://api.mailgun.net/v3/${this.domain}/events`,
          {
            auth: {
              username: 'api',
              password: this.apiKey
            }
          }
        );
        
        return {
          success: true,
          statusCode: response.status
        };
      }
      
      throw new Error(`Unsupported email provider: ${this.provider}`);
    } catch (error) {
      console.error(`Error verifying email connection for ${this.provider}:`, error);
      throw new Error(`Failed to verify email connection: ${error.message}`);
    }
  }
  
  // Process template with variables
  static processTemplate(template, variables) {
    let content = template;
    
    // Replace variables in the format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value);
    });
    
    return content;
  }
}

// Protected routes for email integration
router.use(authenticate);

// Connect email service
router.post('/connect', async (req, res) => {
  try {
    const { provider, credentials, name } = req.body;
    const userId = req.user._id;
    
    if (!provider || !credentials) {
      return res.status(400).json({ 
        success: false, 
        message: 'Provider and credentials are required' 
      });
    }
    
    // Validate credentials based on provider
    if (provider === 'smtp' && (!credentials.host || !credentials.port || !credentials.user || !credentials.password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'SMTP credentials must include host, port, user, and password' 
      });
    } else if ((provider === 'sendgrid' || provider === 'mailgun') && !credentials.apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: `${provider} credentials must include apiKey` 
      });
    }
    
    if (provider === 'mailgun' && !credentials.domain) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mailgun credentials must include domain' 
      });
    }
    
    // Check if email integration already exists
    const existingIntegration = await Integration.findOne({ 
      user: userId,
      platform: 'email'
    });
    
    if (existingIntegration) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email integration already exists. Please update the existing integration.' 
      });
    }
    
    // Create email service to verify connection
    const emailService = new EmailService(credentials, provider);
    
    try {
      await emailService.verifyConnection();
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: `Failed to connect to email service: ${error.message}` 
      });
    }
    
    // Create new email integration
    const integration = new Integration({
      user: userId,
      platform: 'email',
      name: name || `${provider.charAt(0).toUpperCase() + provider.slice(1)} Email`,
      credentials,
      settings: {
        provider,
        defaultFrom: credentials.defaultFrom || credentials.user
      },
      status: 'active'
    });
    
    await integration.save();
    
    // Remove sensitive data from response
    const responseIntegration = integration.toObject();
    delete responseIntegration.credentials;
    
    res.status(201).json({
      success: true,
      data: {
        integration: responseIntegration
      },
      message: 'Email integration created successfully'
    });
    
  } catch (error) {
    console.error('Email integration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error creating email integration' 
    });
  }
});

// Send email
router.post('/send', async (req, res) => {
  try {
    const { to, subject, text, html, templateId, variables, from, attachments } = req.body;
    const userId = req.user._id;
    
    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email (to) is required' 
      });
    }
    
    if (!subject && !templateId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject is required when not using a template' 
      });
    }
    
    if (!text && !html && !templateId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either text, html, or templateId is required' 
      });
    }
    
    // Find the active email integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'email',
      status: 'active'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active email integration found' 
      });
    }
    
    let emailContent = { subject, text, html };
    
    // If using a template, fetch and process it
    if (templateId) {
      const template = await MessageTemplate.findOne({
        _id: templateId,
        user: userId,
        platform: 'email',
        active: true
      });
      
      if (!template) {
        return res.status(404).json({ 
          success: false, 
          message: 'Email template not found or not active' 
        });
      }
      
      // Process template with variables
      emailContent.subject = template.subject 
        ? EmailService.processTemplate(template.subject, variables || {})
        : subject;
      
      emailContent.text = EmailService.processTemplate(template.content, variables || {});
      
      // If template has HTML content
      if (template.html) {
        emailContent.html = EmailService.processTemplate(template.html, variables || {});
      }
    }
    
    // Create email service
    const emailService = new EmailService(
      integration.credentials,
      integration.settings.provider
    );
    
    // Send the email
    const result = await emailService.sendEmail({
      from: from || integration.settings.defaultFrom,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments
    });
    
    // Log the email
    await Log.create({
      user: userId,
      type: 'email_sent',
      source: 'email',
      referenceId: integration._id,
      referenceModel: 'Integration',
      status: 'success',
      details: {
        to,
        subject: emailContent.subject,
        templateId: templateId || null,
        messageId: result.messageId
      }
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error sending email' 
    });
  }
});

module.exports = {
  router,
  EmailService
};
