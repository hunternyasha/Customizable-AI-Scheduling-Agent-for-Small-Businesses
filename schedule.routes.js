const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const scheduleController = require('../controllers/schedule.controller');

// All routes require authentication
router.use(authenticate);

// Schedule routes
router.post('/', scheduleController.createScheduleValidation, scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.get('/:id', scheduleController.getScheduleById);
router.put('/:id', scheduleController.updateScheduleValidation, scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);
router.post('/:id/time-slots', scheduleController.generateTimeSlotsValidation, scheduleController.generateTimeSlots);

module.exports = router;
