const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['confirmation', 'reminder', 'cancellation', 'reschedule', 'follow-up', 'custom'],
    required: true
  },
  platform: {
    type: String,
    enum: ['email', 'whatsapp', 'facebook', 'instagram', 'all'],
    required: true
  },
  subject: {
    type: String,
    trim: true
  }, // For email templates
  content: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const MessageTemplate = mongoose.model('MessageTemplate', messageTemplateSchema);

module.exports = MessageTemplate;
