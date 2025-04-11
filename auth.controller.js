const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config');
const { User } = require('../models');

// Register a new user
const register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, businessName, timezone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // Will be hashed by pre-save hook
      businessName,
      timezone: timezone || 'UTC',
      role: 'business' // Default role for new registrations
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    // Return user data (excluding password) and token
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          timezone: user.timezone,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    // Return user data and token
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          timezone: user.timezone,
          role: user.role,
          metaIntegrations: user.metaIntegrations,
          googleCalendarIntegrated: user.googleCalendarIntegrated
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          timezone: user.timezone,
          role: user.role,
          metaIntegrations: user.metaIntegrations,
          googleCalendarIntegrated: user.googleCalendarIntegrated,
          emailSettings: {
            provider: user.emailSettings.provider,
            fromEmail: user.emailSettings.fromEmail,
            fromName: user.emailSettings.fromName
          }
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, businessName, timezone, emailSettings } = req.body;
    const userId = req.user._id;

    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: name || req.user.name,
          businessName: businessName || req.user.businessName,
          timezone: timezone || req.user.timezone,
          'emailSettings.fromEmail': emailSettings?.fromEmail || req.user.emailSettings.fromEmail,
          'emailSettings.fromName': emailSettings?.fromName || req.user.emailSettings.fromName
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          businessName: updatedUser.businessName,
          timezone: updatedUser.timezone,
          role: updatedUser.role,
          emailSettings: {
            provider: updatedUser.emailSettings.provider,
            fromEmail: updatedUser.emailSettings.fromEmail,
            fromName: updatedUser.emailSettings.fromName
          }
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error changing password' });
  }
};

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName').optional(),
  body('timezone').optional()
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('name').optional(),
  body('businessName').optional(),
  body('timezone').optional(),
  body('emailSettings.fromEmail').optional().isEmail().withMessage('Valid from email is required'),
  body('emailSettings.fromName').optional()
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
};
