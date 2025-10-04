/**
 * @fileoverview This file defines the routes for the logged-in user to manage
 * their own orders. It includes routes for viewing order history and cancelling
 * a pending order.
 * All routes are protected and require user authentication.
 */

const { Router } = require('express');
const { query, param } = require('express-validator');

// Import user-facing controller functions
const {
  handleGetUserOrders,
  handleCancelOrder,
  handleGetOrderDetail, // A specific controller for user-viewing-their-own-order
} = require('../controllers/orderController.js');

// Import authentication and authorization middleware
const { protect, isOrderOwner } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- MIDDLEWARE ---
// ===============================================================

// Apply the `protect` middleware to every single route defined in this file.
// This ensures that no unauthenticated user can access these endpoints.
router.use(protect);

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const getUserOrdersValidation = [
  query('status').optional().isNumeric().withMessage('Status must be a numeric value.'),
  query('limit').optional().isNumeric().toInt(),
  query('page').optional().isNumeric().toInt(),
];

const idParamValidation = [
  param('id', 'A numeric order ID is required in the URL path').isNumeric(),
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

/**
 * @route   GET /api/profile/orders
 * @desc    Get a paginated list of the logged-in user's own orders.
 * @access  Private
 */
router.get(
    '/',
    getUserOrdersValidation,
    handleGetUserOrders
);

/**
 * @route   GET /api/profile/orders/:id
 * @desc    Get the details of a specific order belonging to the logged-in user.
 * @access  Private (Owner)
 */
router.get(
    '/:id',
    isOrderOwner, // Middleware ensures the user owns this order before proceeding
    idParamValidation,
    handleGetOrderDetail // Using a dedicated controller for this is slightly cleaner
);

/**
 * @route   PATCH /api/profile/orders/:id/cancel
 * @desc    Allows a user to cancel one of their own pending orders.
 * @access  Private (Owner)
 */
router.patch(
    '/:id/cancel',
    isOrderOwner, // Critical middleware to verify ownership
    idParamValidation,
    handleCancelOrder
);

module.exports = router;