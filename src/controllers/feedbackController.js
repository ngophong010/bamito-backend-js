const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  createFeedback,
  getAllFeedbackForProduct,
  updateFeedback,
  deleteFeedback,
} = require("../services/feedbackService.js");

/**
 * @desc    Create new feedback for a product
 * @route   POST /api/products/:productId/feedback
 * @access  Private (User)
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateFeedback = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }

  // Get userId from the authenticated token for security.
  // An authentication middleware should ensure req.user exists.
  const userId = req.user.id;
  // Get productId from the URL parameter for RESTful design
  const productId = Number(req.params.productId);

  // Combine all data sources for the service
  const data = { ...req.body, userId, productId };
  
  const newFeedback = await createFeedback(data);
  res.status(201).json({ status: "success", data: newFeedback });
});

/**
 * @desc    Get all feedback for a specific product
 * @route   GET /api/products/:productId/feedback
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllFeedbackForProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.productId);
  const feedbacks = await getAllFeedbackForProduct(productId);

  res.status(200).json({ status: "success", data: feedbacks });
});

/**
 * @desc    Update a feedback entry
 * @route   PUT /api/feedback/:id
 * @access  Private (Owner)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateFeedback = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }
  
  const id = Number(req.params.id);
  const updatedFeedback = await updateFeedback(id, req.body);

  res.status(200).json({ status: "success", data: updatedFeedback });
});

/**
 * @desc    Delete a feedback entry
 * @route   DELETE /api/feedback/:id
 * @access  Private (Admin or Owner)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteFeedback = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  // Note: Your middleware (isOwnerOrAdmin) would handle the authorization logic
  // before this controller is even called.
  await deleteFeedback(id);

  // 204 No Content is standard for successful DELETE
  res.status(204).send();
});

module.exports = {
  handleCreateFeedback,
  handleGetAllFeedbackForProduct,
  handleUpdateFeedback,
  handleDeleteFeedback,
};
