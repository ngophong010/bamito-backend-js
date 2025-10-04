const asyncHandler = require("express-async-handler");
const { validationResult } = require("express-validator");

const {
  createSize,
  deleteSize,
  updateSize,
  getAllSizes,
  getAllSizesByProductType, // Changed from product type to category for consistency
} = require("../services/sizeService.js");

/**
 * @desc    Create a new size
 * @route   POST /api/sizes
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateSize = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const newSize = await createSize(req.body);
  res.status(201).json({ status: "success", data: newSize });
});

/**
 * @desc    Get all sizes with filtering, sorting, and pagination
 * @route   GET /api/sizes
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllSizes = asyncHandler(async (req, res) => {
  const { limit, page, sort, name } = req.query;

  const sizeData = await getAllSizes(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort,
    name
  );
  res.status(200).json({ status: "success", data: sizeData });
});

/**
 * @desc    Update an existing size
 * @route   PUT /api/sizes/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateSize = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const id = Number(req.params.id);
  const updatedSize = await updateSize(id, req.body);
  res.status(200).json({ status: "success", data: updatedSize });
});

/**
 * @desc    Delete a size by its ID
 * @route   DELETE /api/sizes/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteSize = asyncHandler(async (req, res) => {
  // ID should come from URL parameters for RESTful design
  const id = Number(req.params.id);
  await deleteSize(id);
  // 204 No Content is standard for successful DELETE
  res.status(204).send(); 
});

/**
 * @desc    Get all sizes related to a specific product category
 * @route   GET /api/categories/:categoryId/sizes
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllSizesByCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Best practice: Get the category ID from the URL parameters
  const categoryId = Number(req.params.categoryId);
  const sizes = await getAllSizesByProductType(categoryId);
  res.status(200).json({ status: "success", data: sizes });
});

module.exports = {
  handleCreateSize,
  handleGetAllSizes,
  handleUpdateSize,
  handleDeleteSize,
  handleGetAllSizesByCategory,
};
