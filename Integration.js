const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'facebook', 'instagram', 'google_calendar', 'email'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'error'],
    default: 'pending'
  },
  credentials: {
    type: Object,
    required: true
  },
  settings: {
    type: Object,
    default: {}
  },
  webhookUrl: String,
  webhookSecret: String,
  lastSyncedAt: Date,
  errorMessage: String,
  errorCount: {
    type: Number,
    default: 0
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

// Ensure each user can only have one integration per platform
integrationSchema.index({ user: 1, platform: 1 }, { unique: true });

const Integration = mongoose.model('Integration', integrationSchema);

module.exports = Integration;
