/**
 * @fileoverview This file defines the RESTful API routes for the Size resource.
 * It includes public routes for fetching sizes by product type, and admin-only
 * routes for full CRUD operations on all sizes.
 */

const express = require("express");
const { body, query, param } = require("express-validator");

const {
  handleCreateSize,
  handleDeleteSize,
  handleUpdateSize,
  handleGetAllSizes,
  handleGetAllSizesByCategory,
} = require("../controllers/sizeController.js");
const { protect, isAdmin } = require("../middleware/auth.js");

const router = express.Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

const createValidation = [
  body('sizeId', 'Size ID is required').isString().notEmpty().trim(),
  body('sizeName', 'Size Name is required').isString().notEmpty().trim(),
  body('productTypeId', 'A numeric productTypeId is required').isNumeric(),
];

const updateValidation = [
  body('sizeId', 'Size ID must be a string').optional().isString().notEmpty().trim(),
  body('sizeName', 'Size Name must be a string').optional().isString().notEmpty().trim(),
  body('productTypeId', 'Product Type ID must be a number').optional().isNumeric(),
];

const idParamValidation = [
  param('id', 'A numeric ID is required in the URL path').isNumeric(),
];

const getAllValidation = [
    query('limit').optional().isNumeric().toInt(),
    query('page').optional().isNumeric().toInt(),
    query('name').optional().isString().trim(),
];

// Note: The original code used a query param. A more RESTful approach could be
// GET /api/product-types/:productTypeId/sizes, but a query param is also a valid pattern.
const getByCategoryValidation = [ // Renamed for clarity
    param('categoryId', 'A numeric categoryId is required').isNumeric().toInt(),
];

// ===============================================================
// --- ROUTE DEFINITIONS (RESTful & Explicit) ---
// ===============================================================

/**
 * @route   GET /api/categories/:categoryId/sizes
 * @desc    Get all sizes for a specific product category
 * @access  Public
 */
// This route is often nested under the parent resource (Category) for better RESTful design.
// I'll create a dedicated router for that.
const categorySizesRouter = express.Router({ mergeParams: true });
categorySizesRouter.get(
    '/',
    getByCategoryValidation,
    handleGetAllSizesByCategory
);
// This allows you to do `app.use('/api/categories', categorySizesRouter)` in your main router file.

// This is the main router for /api/sizes
router.route("/")
    /**
     * @route   GET /api/sizes
     * @desc    Get a paginated list of all sizes (for admin)
     * @access  Public
     */
    .get(
        getAllValidation,
        handleGetAllSizes
    )
    /**
     * @route   POST /api/sizes
     * @desc    Create a new size
     * @access  Private (Admin)
     */
    .post(
        protect,
        isAdmin,
        createValidation,
        handleCreateSize
    );

router.route("/:id")
    /**
     * @route   PUT /api/sizes/:id
     * @desc    Update a size by its numeric ID
     * @access  Private (Admin)
     */
    .put(
        protect,
        isAdmin,
        idParamValidation,
        updateValidation,
        handleUpdateSize
    )
    /**
     * @route   DELETE /api/sizes/:id
     * @desc    Delete a size by its numeric ID
     * @access  Private (Admin)
     */
    .delete(
        protect,
        isAdmin,
        idParamValidation,
        handleDeleteSize
    );

module.exports = {
    sizesRouter: router, // The main /api/sizes router
    categorySizesRouter, // The nested /api/categories/:categoryId/sizes router
};
