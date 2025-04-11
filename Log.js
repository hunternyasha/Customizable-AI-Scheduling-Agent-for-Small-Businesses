const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'debug'],
    default: 'info'
  },
  source: {
    type: String,
    enum: ['system', 'whatsapp', 'facebook', 'instagram', 'google_calendar', 'email', 'n8n', 'api'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
logSchema.index({ timestamp: -1 });
logSchema.index({ user: 1, timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
