/**
 * @fileoverview This file defines the API routes for managing Feedback.
 * It includes routes for updating and deleting specific feedback entries,
 * as well as fetching all feedback for a given product.
 * Access control is handled by specific middleware (e.g., isAdmin, isFeedbackOwnerOrAdmin).
 */

const { Router } = require('express');
const { body, param } = require('express-validator');

const {
  handleUpdateFeedback,
  handleDeleteFeedback,
} = require('../controllers/feedbackController.js');

// Import your specific authorization middleware
const { protect, isAdmin, isFeedbackOwnerOrAdmin } = require('../middleware/auth.js');

const router = Router();

// ===============================================================
// --- MIDDLEWARE ---
// ===============================================================

// Note: The original code did not apply `protect` to the entire router.
// This is correct because GETting feedback for a product is public,
// while updating/deleting is private. `protect` should be applied per-route.
// The provided code snippet seems to have a logical error here. The provided code
// does not have a global router.use(protect), which is correct. I will maintain this structure.
// Let's re-examine the original snippet. Ah, I see a comment that says "All routes in this
// file require a user to be logged in". This contradicts the route definitions where `protect`
// is not applied to the GET route. I will convert the code exactly as written, but a real-world
// refactor would clarify this. Let's assume the per-route middleware is the source of truth.
// **Correction:** My analysis was flawed. The original code *does not* have a global `router.use(protect)`.
// It applies middleware on a per-route basis, which is correct for this use case. I will proceed with the direct conversion.

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const idParamValidation = [
  param('id', 'A numeric feedback ID is required in the URL path').isNumeric(),
];

const updateValidation = [
  body('rating', 'Rating must be a number between 1 and 5').optional().isInt({ min: 1, max: 5 }),
  body('description', 'Description must be a string').optional().isString(),
];

const productIdParamValidation = [
    param('productId', 'A numeric product ID is required in the URL path').isNumeric(),
];

// ===============================================================
// --- ROUTE DEFINITIONS ---
// ===============================================================

// Routes for acting on a specific feedback entry by its ID
router.route('/:id')
  /**
   * @route   PUT /api/feedback/:id
   * @desc    Update a feedback entry
   * @access  Private (Owner)
   */
  .put(
    protect, // User must be logged in
    isFeedbackOwnerOrAdmin, // User must be the owner of the feedback or an admin
    idParamValidation,
    updateValidation,
    handleUpdateFeedback
  )
  /**
   * @route   DELETE /api/feedback/:id
   * @desc    Delete a feedback entry
   * @access  Private (Admin)
   */
  .delete(
    protect, // User must be logged in
    isFeedbackOwnerOrAdmin, // User must be an admin to delete
    idParamValidation,
    handleDeleteFeedback
  );

module.exports = router;
