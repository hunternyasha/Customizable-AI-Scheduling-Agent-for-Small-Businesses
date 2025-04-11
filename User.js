const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'business', 'user'],
    default: 'business'
  },
  businessName: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  googleCalendarIntegrated: {
    type: Boolean,
    default: false
  },
  googleCalendarRefreshToken: {
    type: String
  },
  metaIntegrations: {
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String },
      businessAccountId: { type: String }
    },
    facebook: {
      enabled: { type: Boolean, default: false },
      pageId: { type: String }
    },
    instagram: {
      enabled: { type: Boolean, default: false },
      accountId: { type: String }
    }
  },
  emailSettings: {
    provider: {
      type: String,
      enum: ['sendgrid', 'mailgun', 'smtp', 'none'],
      default: 'none'
    },
    apiKey: { type: String },
    fromEmail: { type: String },
    fromName: { type: String }
  },
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

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
