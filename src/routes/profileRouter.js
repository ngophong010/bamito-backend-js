/**
 * @fileoverview This file defines the routes for all user profile-related endpoints.
 * It acts as a master router for the /api/profile path, delegating to sub-routers
 * for nested resources like cart, addresses, and favourites.
 * All routes in this file are protected and require user authentication.
 */

const { Router } = require('express');
const { protect } = require('../middleware/auth.js');
const { 
    handleGetProfile, 
    handleUpdateProfile, 
    handleChangePassword 
} = require('../controllers/profileController.js');

// --- Import routers for related profile data ---
const cartRoutes = require('../routes/cartRouter.js');
const profileAddressRoutes = require('./profileAddressRouter.js');
const favouriteRoutes = require('../routes/favouriteRouter.js');
const profileOrderRoutes = require('./profileOrderRouter.js'); // A dedicated user-facing order router

const router = Router();

// All profile routes require a user to be logged in.
// This middleware will apply to every route defined in this file and its sub-routers.
router.use(protect);

// --- Core Profile Management ---
router.route('/')
    .get(handleGetProfile)
    .put(handleUpdateProfile);

router.put('/change-password', handleChangePassword);

// --- Nested Profile Resources ---
// Delegate specific paths to their dedicated sub-routers for better organization.
router.use('/cart', cartRoutes);
router.use('/addresses', profileAddressRoutes);
router.use('/favourites', favouriteRoutes);
router.use('/orders', profileOrderRoutes);

module.exports = router;