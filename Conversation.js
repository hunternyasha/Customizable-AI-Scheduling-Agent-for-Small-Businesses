const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'facebook', 'instagram'],
    required: true
  },
  platformConversationId: {
    type: String,
    required: true
  },
  contact: {
    id: String,
    name: String,
    phone: String,
    email: String,
    platformUserId: String
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'waiting', 'scheduled'],
    default: 'active'
  },
  messages: [{
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    metadata: {
      type: Map,
      of: String
    }
  }],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  n8nWorkflowId: String,
  aiAnalysis: {
    intent: String,
    entities: [{
      type: String,
      value: String,
      confidence: Number
    }],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    }
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
conversationSchema.index({ user: 1, platform: 1, platformConversationId: 1 }, { unique: true });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
