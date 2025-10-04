/**
 * @fileoverview This controller handles the HTTP layer for payment processing.
 * It receives requests, validates them, and calls the appropriate payment service functions.
 */

const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const { 
    createVnPayUrl, 
    handleVnPayReturnService // Renamed in service to avoid name collision
} = require('../services/paymentService.js');

/**
 * @desc    Creates a VNPAY payment URL for a user's checkout data.
 * @route   POST /api/payment/create-url
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreatePaymentUrl = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'fail', data: errors.mapped() });
    }
    
    // Get user ID from the authenticated token for security.
    const userId = req.user.id;
    // Get the user's IP address, required by VNPAY.
    const ipAddr = req.headers["x-forwarded-for"] || req.socket.remoteAddress || '';
    // Combine the request body with the secure user ID.
    const orderData = { ...req.body, userId };

    const paymentUrl = createVnPayUrl(orderData, ipAddr);
    
    res.status(200).json({ status: 'success', data: { paymentUrl } });
});

/**
 * @desc    Handles the callback from VNPAY after a payment attempt.
 * @route   GET /api/payment/vnpay-return
 * @access  Public
 * @param {import('express').Request} req The Express request object, containing VNPAY query params.
 * @param {import('express').Response} res The Express response object.
 */
const handleVnPayReturn = asyncHandler(async (req, res) => {
    try {
        // The service layer handles all the signature verification and order creation logic.
        const newOrder = await handleVnPayReturnService(req.query);
        
        // On success, redirect the user's browser to the client-side "thank you" page.
        // Pass the orderId so the frontend can fetch and display order details.
        res.redirect(`${process.env.URL_CLIENT}/order-success?orderId=${newOrder.orderId}`);
    } catch (error) {
        console.error("VNPAY Return Error:", error.message);
        
        // On any failure (invalid signature, price mismatch, order creation error),
        // redirect to the client-side "payment failed" page with a reason.
        const reason = error.message.includes('signature') ? 'invalid_signature' : 'processing_failed';
        res.redirect(`${process.env.URL_CLIENT}/payment-failed?reason=${reason}`);
    }
});

module.exports = {
    handleCreatePaymentUrl,
    handleVnPayReturn,
};
