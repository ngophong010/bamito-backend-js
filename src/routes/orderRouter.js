/**
 * @fileoverview This file defines the admin-only API routes for managing Orders.
 * It includes routes for fetching all orders, order details, updating status,
 * and viewing reports and statistics. All routes are protected by admin-only middleware.
 */

const { Router } = require('express');
const { body, query, param } = require('express-validator');

const {
  handleGetAllOrdersForAdmin,
  handleGetOrderDetail,
  handleUpdateOrderStatus,
  handleDeleteOrder,
  handleGetStatistics,
  handleGetSalesReport,
} = require('../controllers/orderController.js');
const { protect, isAdmin } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- MIDDLEWARE ---
// ===============================================================

// All routes in this file are for admins only.
router.use(protect, isAdmin);

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const idParamValidation = [ param('id', 'A numeric order ID is required').isNumeric() ];
const statusQueryValidation = [ query('status', 'A numeric status is required').optional().isNumeric() ]; // Made optional for flexibility
const updateStatusValidation = [ body('status', 'A numeric status is required').isNumeric() ];
const reportValidation = [
    query('timeStart', 'A valid ISO8601 start time is required').isISO8601().toDate(),
    query('timeEnd', 'A valid ISO8601 end time is required').isISO8601().toDate(),
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

router.get('/statistics', handleGetStatistics);
router.get('/reports/sales', reportValidation, handleGetSalesReport);

router.route('/')
    /**
     * @route   GET /api/orders
     * @desc    [ADMIN] Get all orders, filterable by status
     * @access  Private (Admin)
     */
    .get(statusQueryValidation, handleGetAllOrdersForAdmin);

router.route('/:id')
    /**
     * @route   GET /api/orders/:id
     * @desc    [ADMIN] Get full details for a specific order
     * @access  Private (Admin)
     */
    .get(idParamValidation, handleGetOrderDetail)
    /**
     * @route   DELETE /api/orders/:id
     * @desc    [ADMIN] Soft-delete an order
     * @access  Private (Admin)
     */
    .delete(idParamValidation, handleDeleteOrder);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    [ADMIN] Update the status of an order
 * @access  Private (Admin)
 */
router.patch(
    '/:id/status', // Use PATCH for partial updates like status change
    idParamValidation,
    updateStatusValidation,
    handleUpdateOrderStatus
);

module.exports = router;
