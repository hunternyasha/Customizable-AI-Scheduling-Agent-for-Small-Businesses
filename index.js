const mongoose = require('mongoose');

// Import models
const User = require('./models/User');
const Schedule = require('./models/Schedule');
const Appointment = require('./models/Appointment');
const MessageTemplate = require('./models/MessageTemplate');
const Conversation = require('./models/Conversation');
const Workflow = require('./models/Workflow');
const Integration = require('./models/Integration');
const Log = require('./models/Log');

// Export all models
module.exports = {
  User,
  Schedule,
  Appointment,
  MessageTemplate,
  Conversation,
  Workflow,
  Integration,
  Log
};
