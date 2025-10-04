/**
 * @fileoverview This file defines the RESTful API routes for the Brand resource.
 * It includes routes for creating, reading, updating, and deleting brands,
 * complete with validation and admin-only access control.
 */

const express = require("express");
const { body, query, param } = require("express-validator");

const {
  handleCreateBrand,
  handleDeleteBrand,
  handleUpdateBrand,
  handleGetAllBrands,
} = require("../controllers/brandController.js");

const { protect, isAdmin } = require("../middleware/auth.js");

const router = express.Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

// Validation for creating a new brand
const createValidation = [
  body('brandId', 'Brand ID is required and must be a non-empty string').isString().notEmpty().trim(),
  body('brandName', 'Brand Name is required and must be a non-empty string').isString().notEmpty().trim(),
];

// Validation for updating an existing brand
const updateValidation = [
  body('brandId', 'Brand ID must be a non-empty string').optional().isString().notEmpty().trim(),
  body('brandName', 'Brand Name must be a non-empty string').optional().isString().notEmpty().trim(),
];

// Validation for the numeric ID in the URL parameter
const idParamValidation = [
  param('id', 'A numeric ID is required in the URL path').isNumeric(),
];

// Validation for query parameters on the GET all route
const getAllValidation = [
    query('limit').optional().isNumeric().toInt(),
    query('page').optional().isNumeric().toInt(),
    query('name').optional().isString().trim(),
    query('pagination').optional().isBoolean(),
];

// ===============================================================
// --- ROUTE DEFINITIONS (RESTful) ---
// ===============================================================

router.route("/")
    /**
     * @route   GET /api/brands
     * @desc    Get a list of all brands (paginated)
     * @access  Public
     */
    .get(
        getAllValidation,
        handleGetAllBrands
    )
    /**
     * @route   POST /api/brands
     * @desc    Create a new brand
     * @access  Private (Admin)
     */
    .post(
        protect,
        isAdmin,
        createValidation,
        handleCreateBrand
    );

router.route("/:id")
    /**
     * @route   PUT /api/brands/:id
     * @desc    Update a brand by its numeric ID
     * @access  Private (Admin)
     */
    .put(
        protect,
        isAdmin,
        idParamValidation,
        updateValidation,
        handleUpdateBrand
    )
    /**
     * @route   DELETE /api/brands/:id
     * @desc    Delete a brand by its numeric ID
     * @access  Private (Admin)
     */
    .delete(
        protect,
        isAdmin,
        idParamValidation,
        handleDeleteBrand
    );

module.exports = router;
