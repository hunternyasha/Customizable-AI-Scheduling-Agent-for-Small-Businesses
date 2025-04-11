const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 5
  },
  bufferBefore: {
    type: Number, // in minutes
    default: 0
  },
  bufferAfter: {
    type: Number, // in minutes
    default: 0
  },
  availability: [{
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday)
      required: true
    },
    startTime: {
      type: String, // HH:MM format
      required: true
    },
    endTime: {
      type: String, // HH:MM format
      required: true
    }
  }],
  timeSlots: [{
    startTime: Date,
    endTime: Date,
    available: {
      type: Boolean,
      default: true
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['physical', 'virtual', 'phone'],
      default: 'virtual'
    },
    details: String
  },
  active: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3498db'
  },
  googleCalendarId: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
