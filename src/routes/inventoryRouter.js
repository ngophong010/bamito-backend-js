/**
 * @fileoverview This file defines the API routes for managing specific Inventory entries.
 * These routes are for admin use only and handle updating and deleting inventory records
 * by their unique primary key.
 * This router is intended to be mounted under `/api/inventory`.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');

const {
  handleUpdateInventoryEntry,
  handleDeleteInventoryEntry,
} = require('../controllers/inventoryController.js'); // Corrected path
const { protect, isAdmin } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- MIDDLEWARE ---
// ===============================================================

// All actions on a specific inventory entry are admin-only, so we can apply
// the middleware to the entire router for simplicity.
router.use(protect, isAdmin);

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

// Validation for the numeric ID in the URL parameter
const idParamValidation = [
  param('id', 'A numeric ID is required in the URL path').isNumeric(),
];

// Validation for the update request body
const updateValidation = [
  // When updating, an admin is likely just changing the quantity.
  body('quantity', 'Quantity must be a non-negative integer').optional().isInt({ min: 0 }),
  // Allowing changes to product/size can be complex; it's often better to delete and recreate.
  // Therefore, we only validate the most common field: quantity.
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

router.route('/:id')
  /**
   * @route   PUT /api/inventory/:id
   * @desc    Update an inventory entry by its unique ID
   * @access  Private (Admin)
   */
  .put(
    idParamValidation,
    updateValidation,
    handleUpdateInventoryEntry
  )
  /**
   * @route   DELETE /api/inventory/:id
   * @desc    Delete an inventory entry by its unique ID
   * @access  Private (Admin)
   */
  .delete(
    idParamValidation,
    handleDeleteInventoryEntry
  );

module.exports = router;