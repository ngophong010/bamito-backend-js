/**
 * @fileoverview This file defines the API routes for the Voucher resource.
 * It includes a public route for fetching active vouchers and admin-only routes
 * for full CRUD operations on all vouchers.
 */

const express = require("express");
const { body, query, param } = require('express-validator');

const {
  handleCreateVoucher,
  handleDeleteVoucher,
  handleUpdateVoucher,
  handleGetAllVouchers,
  handleGetActiveVouchersForUser,
} = require("../controllers/voucherController.js");
const { protect, isAdmin } = require("../middleware/auth.js");
const { uploadImage } = require("../middleware/uploadImage.js");

const router = express.Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const createValidation = [
  body('voucherId', 'Voucher ID is required').isString().notEmpty(),
  body('voucherPrice', 'Voucher Price is required').isNumeric(),
  body('quantity', 'Quantity is required').isInt({ min: 0 }),
  body('timeStart', 'Start time must be a valid ISO 8601 date').isISO8601().toDate(),
  body('timeEnd', 'End time must be a valid ISO 8601 date').isISO8601().toDate(),
];

// For updates, fields are often optional
const updateValidation = [
  body('voucherId', 'Voucher ID must be a string').optional().isString().notEmpty(),
  body('voucherPrice', 'Voucher Price must be a number').optional().isNumeric(),
  body('quantity', 'Quantity must be an integer').optional().isInt({ min: 0 }),
  body('timeStart', 'Start time must be a valid ISO 8601 date').optional().isISO8601().toDate(),
  body('timeEnd', 'End time must be a valid ISO 8601 date').optional().isISO8601().toDate(),
];

const idParamValidation = [
  param('id', 'A numeric voucher ID is required in the URL path').isNumeric(),
];

// ===============================================================
// --- ROUTE DEFINITIONS (RESTful & Explicit) ---
// ===============================================================

/**
 * @route   GET /api/vouchers/all
 * @desc    Get a paginated list of ALL vouchers (for Admins)
 * @access  Private (Admin)
 */
router.get(
  "/all",
  protect,
  isAdmin,
  handleGetAllVouchers // Use the controller for the admin paginated list
);

router.route("/")
    /**
     * @route   GET /api/vouchers
     * @desc    Get all ACTIVE vouchers (for Users)
     * @access  Public
     */
    .get(handleGetActiveVouchersForUser) // This route is unambiguously for public users
    /**
     * @route   POST /api/vouchers
     * @desc    Create a new voucher
     * @access  Private (Admin)
     */
    .post(
        protect,
        isAdmin,
        uploadImage.single('image'),
        createValidation,
        handleCreateVoucher
    );

router.route("/:id")
    /**
     * @route   PUT /api/vouchers/:id
     * @desc    Update a voucher by its numeric ID
     * @access  Private (Admin)
     */
    .put(
        protect,
        isAdmin,
        uploadImage.single('image'),
        idParamValidation,
        updateValidation,
        handleUpdateVoucher
    )
    /**
     * @route   DELETE /api/vouchers/:id
     * @desc    Delete a voucher by its numeric ID
     * @access  Private (Admin)
     */
    .delete(
        protect,
        isAdmin,
        idParamValidation,
        handleDeleteVoucher
    );

module.exports = router;