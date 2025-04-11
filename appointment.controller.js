const express = require('express');
const { body, validationResult } = require('express-validator');
const { Appointment, Schedule } = require('../models');

// Create a new appointment
const createAppointment = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { scheduleId, startTime, endTime, client, notes, source } = req.body;
    const userId = req.user._id;

    // Verify schedule exists and belongs to user
    const schedule = await Schedule.findOne({ _id: scheduleId, user: userId });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    // Create new appointment
    const appointment = new Appointment({
      schedule: scheduleId,
      user: userId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      client,
      notes,
      source: source || 'manual'
    });

    await appointment.save();

    // Update schedule time slots to mark this slot as unavailable
    await Schedule.updateOne(
      { 
        _id: scheduleId,
        'timeSlots.startTime': new Date(startTime),
        'timeSlots.endTime': new Date(endTime)
      },
      { 
        $set: { 'timeSlots.$.available': false }
      }
    );

    res.status(201).json({
      success: true,
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ success: false, message: 'Server error creating appointment' });
  }
};

// Get all appointments for a user
const getAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, status } = req.query;

    // Build query
    const query = { user: userId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.startTime = { 
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('schedule', 'title color location')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      data: {
        appointments
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving appointments' });
  }
};

// Get a single appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({ _id: appointmentId, user: userId })
      .populate('schedule', 'title duration bufferBefore bufferAfter location color');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.json({
      success: true,
      data: {
        appointment
      }
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving appointment' });
  }
};

// Update an appointment
const updateAppointment = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const appointmentId = req.params.id;
    const userId = req.user._id;
    const { startTime, endTime, client, notes, status } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({ _id: appointmentId, user: userId });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // If changing time, update schedule time slots
    if (startTime && endTime && 
        (new Date(startTime).getTime() !== appointment.startTime.getTime() || 
         new Date(endTime).getTime() !== appointment.endTime.getTime())) {
      
      // Mark old slot as available
      await Schedule.updateOne(
        { 
          _id: appointment.schedule,
          'timeSlots.startTime': appointment.startTime,
          'timeSlots.endTime': appointment.endTime
        },
        { 
          $set: { 'timeSlots.$.available': true }
        }
      );
      
      // Mark new slot as unavailable
      await Schedule.updateOne(
        { 
          _id: appointment.schedule,
          'timeSlots.startTime': new Date(startTime),
          'timeSlots.endTime': new Date(endTime)
        },
        { 
          $set: { 'timeSlots.$.available': false }
        }
      );
    }

    // Update appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          startTime: startTime ? new Date(startTime) : appointment.startTime,
          endTime: endTime ? new Date(endTime) : appointment.endTime,
          'client.name': client?.name || appointment.client.name,
          'client.email': client?.email || appointment.client.email,
          'client.phone': client?.phone || appointment.client.phone,
          notes: notes !== undefined ? notes : appointment.notes,
          status: status || appointment.status
        }
      },
      { new: true, runValidators: true }
    ).populate('schedule', 'title duration bufferBefore bufferAfter location color');

    res.json({
      success: true,
      data: {
        appointment: updatedAppointment
      }
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: 'Server error updating appointment' });
  }
};

// Cancel an appointment
const cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user._id;
    const { cancellationReason } = req.body;

    // Find appointment
    const appointment = await Appointment.findOne({ _id: appointmentId, user: userId });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    appointment.notes = cancellationReason ? 
      (appointment.notes ? `${appointment.notes}\n\nCancellation reason: ${cancellationReason}` : `Cancellation reason: ${cancellationReason}`) : 
      appointment.notes;
    
    await appointment.save();

    // Mark time slot as available again
    await Schedule.updateOne(
      { 
        _id: appointment.schedule,
        'timeSlots.startTime': appointment.startTime,
        'timeSlots.endTime': appointment.endTime
      },
      { 
        $set: { 'timeSlots.$.available': true }
      }
    );

    res.json({
      success: true,
      data: {
        appointment
      },
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling appointment' });
  }
};

// Validation rules
const createAppointmentValidation = [
  body('scheduleId').isMongoId().withMessage('Valid schedule ID is required'),
  body('startTime').isISO8601().withMessage('Start time must be a valid date'),
  body('endTime').isISO8601().withMessage('End time must be a valid date'),
  body('client.name').notEmpty().withMessage('Client name is required'),
  body('client.email').isEmail().withMessage('Valid client email is required'),
  body('client.phone').optional(),
  body('notes').optional(),
  body('source').optional().isIn(['whatsapp', 'facebook', 'instagram', 'website', 'manual']).withMessage('Source must be valid')
];

const updateAppointmentValidation = [
  body('startTime').optional().isISO8601().withMessage('Start time must be a valid date'),
  body('endTime').optional().isISO8601().withMessage('End time must be a valid date'),
  body('client.name').optional().notEmpty().withMessage('Client name is required'),
  body('client.email').optional().isEmail().withMessage('Valid client email is required'),
  body('client.phone').optional(),
  body('notes').optional(),
  body('status').optional().isIn(['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show']).withMessage('Status must be valid')
];

const cancelAppointmentValidation = [
  body('cancellationReason').optional()
];

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  createAppointmentValidation,
  updateAppointmentValidation,
  cancelAppointmentValidation
};
