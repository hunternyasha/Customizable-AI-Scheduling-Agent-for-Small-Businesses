const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const appointmentController = require('../controllers/appointment.controller');

// All routes require authentication
router.use(authenticate);

// Appointment routes
router.post('/', appointmentController.createAppointmentValidation, appointmentController.createAppointment);
router.get('/', appointmentController.getAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.put('/:id', appointmentController.updateAppointmentValidation, appointmentController.updateAppointment);
router.post('/:id/cancel', appointmentController.cancelAppointmentValidation, appointmentController.cancelAppointment);

module.exports = router;
