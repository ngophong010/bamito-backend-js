/**
 * @fileoverview This file defines the API routes related to payment processing.
 * It includes a protected route for creating a payment URL and a public callback
 * route for the payment gateway (VNPAY) to return to.
 */

const { Router } = require('express');
const { body } = require('express-validator');
const { handleCreatePaymentUrl, handleVnPayReturn } = require('../controllers/paymentController.js');
const { protect } = require('../middleware/auth.js');

const router = Router();

// --- Validation for creating a payment URL ---
const createPaymentValidation = [
  body('totalPrice', 'Total price must be a numeric value').isNumeric(),
  body('payment', 'Payment method is required').isString().notEmpty(),
  body('deliveryAddress', 'Delivery address is required').isString().notEmpty(),
  body('cartItems', 'Cart items must be an array with at least one item').isArray({ min: 1 }),
  // Note: For production, you would add more detailed validation for the cartItems array elements.
];

/**
 * @route   POST /api/payment/create-url
 * @desc    Create a VNPAY payment URL for the current user's checkout
 * @access  Private
 */
router.post(
    '/create-url',
    protect, // User must be logged in to create a payment
    createPaymentValidation,
    handleCreatePaymentUrl
);

/**
 * @route   GET /api/payment/vnpay-return
 * @desc    Callback URL for VNPAY to return to after a payment attempt.
 *          This endpoint handles the result of the transaction.
 * @access  Public
 */
router.get('/vnpay-return', handleVnPayReturn);

module.exports = router;