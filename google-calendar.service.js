const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Integration, Log } = require('../models');
const { google } = require('googleapis');
const axios = require('axios');

// Service for Google Calendar integration
class GoogleCalendarService {
  constructor(credentials) {
    this.credentials = credentials;
    this.oAuth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
    
    if (credentials.accessToken) {
      this.oAuth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiryDate
      });
    }
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
  }
  
  // Get authorization URL for OAuth flow
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force to get refresh token
    });
  }
  
  // Exchange authorization code for tokens
  async getTokensFromCode(code) {
    const { tokens } = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokens);
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    };
  }
  
  // Refresh access token if expired
  async refreshTokenIfNeeded() {
    const isTokenExpired = this.oAuth2Client.isTokenExpiring();
    
    if (isTokenExpired) {
      try {
        const { credentials } = await this.oAuth2Client.refreshAccessToken();
        this.oAuth2Client.setCredentials(credentials);
        
        return {
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date
        };
      } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Failed to refresh Google Calendar access token');
      }
    }
    
    return null; // No refresh needed
  }
  
  // List calendars
  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items;
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw new Error('Failed to list Google Calendars');
    }
  }
  
  // Create calendar event
  async createEvent(calendarId, event) {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create Google Calendar event');
    }
  }
  
  // Update calendar event
  async updateEvent(calendarId, eventId, event) {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: event
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update Google Calendar event');
    }
  }
  
  // Delete calendar event
  async deleteEvent(calendarId, eventId) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete Google Calendar event');
    }
  }
  
  // List events in a calendar
  async listEvents(calendarId, timeMin, timeMax, maxResults = 100) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items;
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw new Error('Failed to list Google Calendar events');
    }
  }
  
  // Convert appointment to Google Calendar event
  static appointmentToEvent(appointment) {
    const { startTime, endTime, client, notes } = appointment;
    
    return {
      summary: `Appointment with ${client.name}`,
      description: notes || 'No additional notes',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'UTC'
      },
      attendees: [
        { email: client.email, displayName: client.name }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 }
        ]
      },
      extendedProperties: {
        private: {
          appointmentId: appointment._id.toString()
        }
      }
    };
  }
}

// Protected routes for Google Calendar integration
router.use(authenticate);

// Get Google Calendar auth URL
router.get('/auth-url', async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Check if integration already exists
    const existingIntegration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar'
    });
    
    if (existingIntegration && existingIntegration.status === 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'Google Calendar integration already exists and is active' 
      });
    }
    
    // Get client ID and secret from environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({ 
        success: false, 
        message: 'Google Calendar API credentials not configured' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService({
      clientId,
      clientSecret,
      redirectUri
    });
    
    // Get auth URL
    const authUrl = googleCalendarService.getAuthUrl();
    
    // Create or update integration record
    if (existingIntegration) {
      existingIntegration.status = 'pending';
      existingIntegration.credentials = {
        clientId,
        clientSecret,
        redirectUri
      };
      await existingIntegration.save();
    } else {
      await Integration.create({
        user: userId,
        platform: 'google_calendar',
        name: 'Google Calendar',
        credentials: {
          clientId,
          clientSecret,
          redirectUri
        },
        status: 'pending'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        authUrl
      },
      message: 'Google Calendar authorization URL generated'
    });
    
  } catch (error) {
    console.error('Google Calendar auth URL error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error generating Google Calendar auth URL' 
    });
  }
});

// Handle OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = req.user._id;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Authorization code is required' 
      });
    }
    
    // Find the pending integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar',
      status: 'pending'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No pending Google Calendar integration found' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService({
      clientId: integration.credentials.clientId,
      clientSecret: integration.credentials.clientSecret,
      redirectUri: integration.credentials.redirectUri
    });
    
    // Exchange code for tokens
    const tokens = await googleCalendarService.getTokensFromCode(code);
    
    // Update integration with tokens
    integration.credentials = {
      ...integration.credentials,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryDate: tokens.expiryDate
    };
    integration.status = 'active';
    await integration.save();
    
    // Get list of calendars
    const calendarService = new GoogleCalendarService(integration.credentials);
    const calendars = await calendarService.listCalendars();
    
    // Update integration with calendar list
    integration.settings = {
      ...integration.settings,
      calendars: calendars.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary || false
      }))
    };
    await integration.save();
    
    // Log successful integration
    await Log.create({
      user: userId,
      type: 'integration_connected',
      source: 'google_calendar',
      referenceId: integration._id,
      referenceModel: 'Integration',
      status: 'success',
      details: {
        calendarCount: calendars.length
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        integration: {
          _id: integration._id,
          name: integration.name,
          status: integration.status,
          settings: integration.settings
        }
      },
      message: 'Google Calendar integration successful'
    });
    
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error processing Google Calendar callback' 
    });
  }
});

// Create calendar event
router.post('/events', async (req, res) => {
  try {
    const { calendarId, appointment, customEvent } = req.body;
    const userId = req.user._id;
    
    if (!calendarId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Calendar ID is required' 
      });
    }
    
    if (!appointment && !customEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either appointment or customEvent is required' 
      });
    }
    
    // Find the active integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar',
      status: 'active'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Google Calendar integration found' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService(integration.credentials);
    
    // Refresh token if needed
    const refreshResult = await googleCalendarService.refreshTokenIfNeeded();
    if (refreshResult) {
      integration.credentials.accessToken = refreshResult.accessToken;
      integration.credentials.expiryDate = refreshResult.expiryDate;
      await integration.save();
    }
    
    // Convert appointment to event or use custom event
    const event = appointment 
      ? GoogleCalendarService.appointmentToEvent(appointment)
      : customEvent;
    
    // Create the event
    const createdEvent = await googleCalendarService.createEvent(calendarId, event);
    
    // If this was for an appointment, update the appointment with the event ID
    if (appointment && appointment._id) {
      const Appointment = require('../models/Appointment');
      await Appointment.findByIdAndUpdate(appointment._id, {
        $set: {
          'externalReferences.googleCalendar': {
            eventId: createdEvent.id,
            calendarId
          }
        }
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        event: createdEvent
      },
      message: 'Google Calendar event created successfully'
    });
    
  } catch (error) {
    console.error('Google Calendar create event error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error creating Google Calendar event' 
    });
  }
});

// Update calendar event
router.put('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId, appointment, customEvent } = req.body;
    const userId = req.user._id;
    
    if (!calendarId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Calendar ID is required' 
      });
    }
    
    if (!appointment && !customEvent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Either appointment or customEvent is required' 
      });
    }
    
    // Find the active integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar',
      status: 'active'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Google Calendar integration found' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService(integration.credentials);
    
    // Refresh token if needed
    const refreshResult = await googleCalendarService.refreshTokenIfNeeded();
    if (refreshResult) {
      integration.credentials.accessToken = refreshResult.accessToken;
      integration.credentials.expiryDate = refreshResult.expiryDate;
      await integration.save();
    }
    
    // Convert appointment to event or use custom event
    const event = appointment 
      ? GoogleCalendarService.appointmentToEvent(appointment)
      : customEvent;
    
    // Update the event
    const updatedEvent = await googleCalendarService.updateEvent(calendarId, eventId, event);
    
    res.status(200).json({
      success: true,
      data: {
        event: updatedEvent
      },
      message: 'Google Calendar event updated successfully'
    });
    
  } catch (error) {
    console.error('Google Calendar update event error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error updating Google Calendar event' 
    });
  }
});

// Delete calendar event
router.delete('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { calendarId } = req.query;
    const userId = req.user._id;
    
    if (!calendarId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Calendar ID is required' 
      });
    }
    
    // Find the active integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar',
      status: 'active'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Google Calendar integration found' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService(integration.credentials);
    
    // Refresh token if needed
    const refreshResult = await googleCalendarService.refreshTokenIfNeeded();
    if (refreshResult) {
      integration.credentials.accessToken = refreshResult.accessToken;
      integration.credentials.expiryDate = refreshResult.expiryDate;
      await integration.save();
    }
    
    // Delete the event
    await googleCalendarService.deleteEvent(calendarId, eventId);
    
    res.status(200).json({
      success: true,
      message: 'Google Calendar event deleted successfully'
    });
    
  } catch (error) {
    console.error('Google Calendar delete event error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error deleting Google Calendar event' 
    });
  }
});

// List calendar events
router.get('/events', async (req, res) => {
  try {
    const { calendarId, timeMin, timeMax, maxResults } = req.query;
    const userId = req.user._id;
    
    if (!calendarId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Calendar ID is required' 
      });
    }
    
    // Find the active integration
    const integration = await Integration.findOne({ 
      user: userId,
      platform: 'google_calendar',
      status: 'active'
    });
    
    if (!integration) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active Google Calendar integration found' 
      });
    }
    
    // Create Google Calendar service
    const googleCalendarService = new GoogleCalendarService(integration.credentials);
    
    // Refresh token if needed
    const refreshResult = await googleCalendarService.refreshTokenIfNeeded();
    if (refreshResult) {
      integration.credentials.accessToken = refreshResult.accessToken;
      integration.credentials.expiryDate = refreshResult.expiryDate;
      await integration.save();
    }
    
    // List events
    const events = await googleCalendarService.listEvents(
      calendarId,
      timeMin,
      timeMax,
      maxResults ? parseInt(maxResults) : 100
    );
    
    res.status(200).json({
      success: true,
      data: {
        events
      },
      message: 'Google Calendar events retrieved successfully'
    });
    
  } catch (error) {
    console.error('Google Calendar list events error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error listing Google Calendar events' 
    });
  }
});

module.exports = {
  router,
  GoogleCalendarService
};
