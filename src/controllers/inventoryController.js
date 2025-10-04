const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  createInventoryEntry,
  deleteInventoryEntry,
  updateInventoryEntry,
  getInventoryForProduct,
} = require("../services/inventoryService.js");

/**
 * @desc    Create a new inventory entry for a specific product
 * @route   POST /api/products/:productId/inventory
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateInventoryEntry = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Get productId from the URL, combine with body data for the service
  const productId = Number(req.params.productId);
  const data = { ...req.body, productId };
  
  const newEntry = await createInventoryEntry(data);
  res.status(201).json({ status: "success", data: newEntry });
});

/**
 * @desc    Get all inventory entries for a specific product
 * @route   GET /api/products/:productId/inventory
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetInventoryForProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const productId = Number(req.params.productId);
  const { limit, page, sort } = req.query;

  const inventoryData = await getInventoryForProduct(
    productId,
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort // Pass string directly
  );
  res.status(200).json({ status: "success", data: inventoryData });
});

/**
 * @desc    Update a specific inventory entry by its own ID
 * @route   PUT /api/inventory/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateInventoryEntry = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const id = Number(req.params.id);
  const updatedEntry = await updateInventoryEntry(id, req.body);
  res.status(200).json({ status: "success", data: updatedEntry });
});

/**
 * @desc    Delete a specific inventory entry by its own ID
 * @route   DELETE /api/inventory/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteInventoryEntry = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await deleteInventoryEntry(id);
  // Standard response for a successful DELETE with no content to return.
  res.status(204).send(); 
});

module.exports = {
  handleCreateInventoryEntry,
  handleGetInventoryForProduct,
  handleUpdateInventoryEntry,
  handleDeleteInventoryEntry,
};