const express = require('express');
const { body, validationResult } = require('express-validator');
const { Schedule } = require('../models');

// Create a new schedule
const createSchedule = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, description, duration, bufferBefore, bufferAfter, availability, location, color } = req.body;
    const userId = req.user._id;

    // Create new schedule
    const schedule = new Schedule({
      user: userId,
      title,
      description,
      duration,
      bufferBefore: bufferBefore || 0,
      bufferAfter: bufferAfter || 0,
      availability,
      location,
      color: color || '#3498db'
    });

    await schedule.save();

    res.status(201).json({
      success: true,
      data: {
        schedule
      }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error creating schedule' });
  }
};

// Get all schedules for a user
const getSchedules = async (req, res) => {
  try {
    const userId = req.user._id;

    const schedules = await Schedule.find({ user: userId });

    res.json({
      success: true,
      data: {
        schedules
      }
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving schedules' });
  }
};

// Get a single schedule by ID
const getScheduleById = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const userId = req.user._id;

    const schedule = await Schedule.findOne({ _id: scheduleId, user: userId });

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      data: {
        schedule
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving schedule' });
  }
};

// Update a schedule
const updateSchedule = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const scheduleId = req.params.id;
    const userId = req.user._id;
    const { title, description, duration, bufferBefore, bufferAfter, availability, location, color, active } = req.body;

    // Find schedule and update
    const updatedSchedule = await Schedule.findOneAndUpdate(
      { _id: scheduleId, user: userId },
      {
        $set: {
          title,
          description,
          duration,
          bufferBefore,
          bufferAfter,
          availability,
          location,
          color,
          active
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      data: {
        schedule: updatedSchedule
      }
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error updating schedule' });
  }
};

// Delete a schedule
const deleteSchedule = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const userId = req.user._id;

    const schedule = await Schedule.findOneAndDelete({ _id: scheduleId, user: userId });

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting schedule' });
  }
};

// Generate time slots for a schedule
const generateTimeSlots = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const scheduleId = req.params.id;
    const userId = req.user._id;
    const { startDate, endDate } = req.body;

    // Find schedule
    const schedule = await Schedule.findOne({ _id: scheduleId, user: userId });

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date' });
    }

    // Generate time slots based on availability
    const timeSlots = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0-6 (Sunday-Saturday)
      
      // Find availability for this day
      const dayAvailability = schedule.availability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (dayAvailability) {
        // Parse start and end times
        const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
        
        // Create date objects for start and end times
        const slotStartTime = new Date(currentDate);
        slotStartTime.setHours(startHour, startMinute, 0, 0);
        
        const slotEndTime = new Date(currentDate);
        slotEndTime.setHours(endHour, endMinute, 0, 0);
        
        // Generate slots based on duration
        let currentSlotStart = new Date(slotStartTime);
        
        while (currentSlotStart.getTime() + (schedule.duration * 60000) <= slotEndTime.getTime()) {
          const currentSlotEnd = new Date(currentSlotStart.getTime() + (schedule.duration * 60000));
          
          timeSlots.push({
            startTime: new Date(currentSlotStart),
            endTime: new Date(currentSlotEnd),
            available: true
          });
          
          // Move to next slot
          currentSlotStart = new Date(currentSlotStart.getTime() + (schedule.duration * 60000) + (schedule.bufferAfter * 60000) + (schedule.bufferBefore * 60000));
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    // Update schedule with generated time slots
    schedule.timeSlots = timeSlots;
    await schedule.save();

    res.json({
      success: true,
      data: {
        schedule
      }
    });
  } catch (error) {
    console.error('Generate time slots error:', error);
    res.status(500).json({ success: false, message: 'Server error generating time slots' });
  }
};

// Validation rules
const createScheduleValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  body('bufferBefore').optional().isInt({ min: 0 }).withMessage('Buffer before must be a positive number'),
  body('bufferAfter').optional().isInt({ min: 0 }).withMessage('Buffer after must be a positive number'),
  body('availability').isArray().withMessage('Availability must be an array'),
  body('availability.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
  body('availability.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('availability.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('location.type').optional().isIn(['physical', 'virtual', 'phone']).withMessage('Location type must be physical, virtual, or phone'),
  body('location.details').optional(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color')
];

const updateScheduleValidation = [
  body('title').optional().notEmpty().withMessage('Title is required'),
  body('duration').optional().isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  body('bufferBefore').optional().isInt({ min: 0 }).withMessage('Buffer before must be a positive number'),
  body('bufferAfter').optional().isInt({ min: 0 }).withMessage('Buffer after must be a positive number'),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
  body('availability.*.dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 and 6'),
  body('availability.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be in HH:MM format'),
  body('availability.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be in HH:MM format'),
  body('location.type').optional().isIn(['physical', 'virtual', 'phone']).withMessage('Location type must be physical, virtual, or phone'),
  body('location.details').optional(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('active').optional().isBoolean().withMessage('Active must be a boolean')
];

const generateTimeSlotsValidation = [
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date')
];

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  generateTimeSlots,
  createScheduleValidation,
  updateScheduleValidation,
  generateTimeSlotsValidation
};
