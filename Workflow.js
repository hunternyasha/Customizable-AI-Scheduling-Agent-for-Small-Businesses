const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['messaging', 'scheduling', 'reminder', 'notification', 'custom'],
    required: true
  },
  n8nWorkflowId: {
    type: String
  },
  n8nWorkflowData: {
    type: Object
  },
  triggers: [{
    event: {
      type: String,
      enum: ['message_received', 'appointment_created', 'appointment_reminder', 'appointment_cancelled', 'custom'],
      required: true
    },
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'exists']
      },
      value: mongoose.Schema.Types.Mixed
    }]
  }],
  actions: [{
    type: {
      type: String,
      enum: ['send_message', 'create_appointment', 'update_appointment', 'send_email', 'webhook', 'custom'],
      required: true
    },
    config: {
      type: Object
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  lastExecuted: {
    type: Date
  },
  executionCount: {
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

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;
