const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

// Public routes
router.post('/register', authController.registerValidation, authController.register);
router.post('/login', authController.loginValidation, authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfileValidation, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePasswordValidation, authController.changePassword);

module.exports = router;
