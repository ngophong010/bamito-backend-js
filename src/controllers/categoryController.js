const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../services/categoryService.js");

/**
 * @desc    Create a new category
 * @route   POST /api/v1/categories
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleCreateCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // The service returns the new category object on success
  const newCategory = await createCategory(req.body);
  res.status(201).json({ status: "success", data: newCategory });
});

/**
 * @desc    Get all categories with filtering, sorting, and pagination
 * @route   GET /api/v1/categories
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetAllCategories = asyncHandler(async (req, res) => {
  const { limit, page, sort, name } = req.query;
  // Default pagination to true if the query param is not 'false'
  const pagination = req.query.pagination !== 'false'; 

  const categoryData = await getAllCategories(
    limit ? Number(limit) : undefined,
    page ? Number(page) : undefined,
    sort, // Pass string directly
    name, // Pass string directly
    pagination
  );

  res.status(200).json({ status: "success", data: categoryData });
});

/**
 * @desc    Get a single category by its ID
 * @route   GET /api/v1/categories/:categoryId
 * @access  Public
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetCategoryById = asyncHandler(async (req, res) => {
  // Get the business ID from the URL parameter
  const { categoryId } = req.params; 
  const category = await getCategoryById(categoryId);

  if (!category) {
    // If the service returns null, it means not found.
    return res.status(404).json({ status: "fail", message: "Category not found." });
  }

  res.status(200).json({ status: "success", data: category });
});

/**
 * @desc    Update an existing category
 * @route   PUT /api/v1/categories/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleUpdateCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Get the numeric primary key from the URL parameter
  const id = Number(req.params.id);
  const updatedCategory = await updateCategory(id, req.body);
  res.status(200).json({ status: "success", data: updatedCategory });
});

/**
 * @desc    Delete a category by its ID
 * @route   DELETE /api/v1/categories/:id
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleDeleteCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const id = Number(req.params.id);
  await deleteCategory(id);
  // Standard response for a successful DELETE with no content to return.
  res.status(204).send(); 
});

module.exports = {
  handleCreateCategory,
  handleGetCategoryById,
  handleGetAllCategories,
  handleUpdateCategory,
  handleDeleteCategory,
};