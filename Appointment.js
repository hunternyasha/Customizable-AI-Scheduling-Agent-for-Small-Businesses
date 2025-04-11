const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true
  },
  googleEventId: String,
  remindersSent: [{
    type: {
      type: String,
      enum: ['email', 'whatsapp', 'facebook', 'instagram'],
      required: true
    },
    sentAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'delivered', 'read'],
      required: true
    }
  }],
  source: {
    type: String,
    enum: ['whatsapp', 'facebook', 'instagram', 'website', 'manual'],
    default: 'website'
  },
  conversationId: String, // Reference to the conversation that created this appointment
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
