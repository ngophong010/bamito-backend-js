/**
 * @fileoverview This file defines the RESTful API routes for the Category resource.
 * It includes routes for creating, reading, updating, and deleting categories,
 * complete with validation and admin-only access control.
 * It distinguishes between numeric ID for internal operations and a string ID for public lookups.
 */

const express = require("express");
const { body, query, param } = require('express-validator');

const {
  handleCreateCategory,
  handleDeleteCategory,
  handleUpdateCategory,
  handleGetAllCategories,
  handleGetCategoryById,
} = require("../controllers/categoryController.js");
const { protect, isAdmin } = require("../middleware/auth.js");

const router = express.Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const createValidation = [
  body('categoryId', 'Category ID is required').isString().notEmpty().trim(),
  body('name', 'Category Name is required').isString().notEmpty().trim(),
];

const updateValidation = [
  body('categoryId', 'Category ID must be a string').optional().isString().notEmpty().trim(),
  body('name', 'Category Name must be a string').optional().isString().notEmpty().trim(),
];

const idParamValidation = [
  param('id', 'A numeric primary key ID is required in the URL path').isNumeric(),
];

const categoryIdParamValidation = [
  param('categoryId', 'A string business ID is required in the URL path').isString().notEmpty().trim(),
];

// ===============================================================
// --- ROUTE DEFINITIONS (RESTful & Unambiguous) ---
// ===============================================================

router.route("/")
    /**
     * @route   GET /api/categories
     * @desc    Get all categories (paginated or full list)
     * @access  Public
     */
    .get(handleGetAllCategories)
    /**
     * @route   POST /api/categories
     * @desc    Create a new category
     * @access  Private (Admin)
     */
    .post(
        protect,
        isAdmin,
        createValidation,
        handleCreateCategory
    );

/**
 * @route   GET /api/categories/details/:categoryId
 * @desc    Get a single category by its unique, string-based business ID
 * @access  Public
 */
router.get(
  "/details/:categoryId",
  categoryIdParamValidation,
  handleGetCategoryById
);

// Routes that operate on a resource via its numeric primary key (typically for admin)
router.route("/:id")
    /**
     * @route   PUT /api/categories/:id
     * @desc    Update a category by its numeric primary key
     * @access  Private (Admin)
     */
    .put(
        protect,
        isAdmin,
        idParamValidation,
        updateValidation,
        handleUpdateCategory
    )
    /**
     * @route   DELETE /api/categories/:id
     * @desc    Delete a category by its numeric primary key
     * @access  Private (Admin)
     */
    .delete(
        protect,
        isAdmin,
        idParamValidation,
        handleDeleteCategory
    );

module.exports = router;
