const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  addOrUpdateCartItem,
  removeCartItem,
  getCartContents,
} = require("../services/cartService.js");

/**
 * @desc    Add or update an item in the logged-in user's cart.
 * @route   POST /api/profile/cart/items
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req - The Express request object, augmented with a user property.
 * @param {import('express').Response} res - The Express response object.
 */
const handleAddOrUpdateItem = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // This is a "fail" response according to JSend
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }

  // CRITICAL: Get userId from the authenticated token for security.
  // An authentication middleware should ensure req.user exists on private routes.
  const userId = req.user.id;
  const { productId, sizeId, quantity } = req.body;

  const updatedItem = await addOrUpdateCartItem({ userId, productId, sizeId, quantity });
  // Use 200 OK for an upsert operation as it could be either a create or update.
  res.status(200).json({ status: "success", data: updatedItem });
});

/**
 * @desc    Get all items in the logged-in user's cart.
 * @route   GET /api/profile/cart
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req - The Express request object, augmented with a user property.
 * @param {import('express').Response} res - The Express response object.
 */
const handleGetCartContents = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cartContents = await getCartContents(userId);
  res.status(200).json({ status: "success", data: cartContents });
});

/**
 * @desc    Remove a specific item from the logged-in user's cart.
 * @route   DELETE /api/profile/cart/items
 * @access  Private
 * @param {import('express').Request & { user?: { id: number } }} req - The Express request object, augmented with a user property.
 * @param {import('express').Response} res - The Express response object.
 */
const handleRemoveItem = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }
  
  const userId = req.user.id;
  // Get product/size info from the request body for DELETE, as it's a composite key.
  const { productId, sizeId } = req.body;

  await removeCartItem(userId, productId, sizeId);
  // Standard response for a successful DELETE operation with no content to return.
  res.status(204).send(); 
});

module.exports = {
    handleAddOrUpdateItem,
    handleGetCartContents,
    handleRemoveItem,
};
