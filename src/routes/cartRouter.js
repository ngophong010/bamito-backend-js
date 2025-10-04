/**
 * @fileoverview This file defines the routes for all shopping cart-related actions.
 * All routes are protected and require user authentication. The routes are intended
 * to be mounted under the `/api/profile/cart` path.
 */

const { Router } = require('express');
const { body } = require('express-validator');

const {
  handleAddOrUpdateItem,
  handleRemoveItem,
  handleGetCartContents,
} = require('../controllers/cartController.js');
const { protect } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- MIDDLEWARE ---
// ===============================================================

// All cart actions require a user to be logged in, so we apply the `protect`
// middleware to the entire router for security and simplicity.
router.use(protect);

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

// Validation for identifying a unique item in the cart (product + size)
const itemIdentifiersValidation = [
  body('productId', 'A numeric productId is required').isNumeric(),
  body('sizeId', 'A numeric sizeId is required').isNumeric(),
];

// Validation for adding or updating an item, which requires quantity
const addOrUpdateValidation = [
  ...itemIdentifiersValidation, // Reuse the identifier validation
  body('quantity', 'Quantity must be a non-negative integer').isInt({ min: 0 }),
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

/**
 * @route   GET /api/profile/cart
 * @desc    Get the full contents of the logged-in user's cart.
 * @access  Private
 */
router.get('/', handleGetCartContents);

// This route group handles actions on the collection of items within the cart.
router.route('/items')
  /**
   * @route   POST /api/profile/cart/items
   * @desc    Add or update an item in the cart. The service handles the "upsert" logic.
   * @access  Private
   */
  .post(
    addOrUpdateValidation,
    handleAddOrUpdateItem
  )
  /**
   * @route   DELETE /api/profile/cart/items
   * @desc    Remove a specific item (product/size combo) from the cart.
   *          Identifiers are passed in the body for simplicity.
   * @access  Private
   */
  .delete(
    itemIdentifiersValidation,
    handleRemoveItem
  );

module.exports = router;
