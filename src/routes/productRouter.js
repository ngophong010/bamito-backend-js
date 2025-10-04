/**
 * @fileoverview This file defines the comprehensive API routes for the Product resource.
 * It includes public-facing routes for querying products, user-protected routes for
 * creating feedback, and admin-only routes for CRUD operations on products and their inventory.
 * It also handles nested resources like feedback and inventory.
 */

const express = require("express");
const { body, query, param } = require('express-validator');

const {
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
  handleGetProductDetails,
  handleGetAllProducts,
  handleGetAllProductsByCategory,
  handleGetAllProductsOnSale,
} = require("../controllers/productController.js");
const {
  handleCreateFeedback,
  handleGetAllFeedbackForProduct,
} = require('../controllers/feedbackController.js');
const { 
  handleGetInventoryForProduct,
  handleCreateInventoryEntry
} = require("../controllers/inventoryController.js");

const { protect, isAdmin } = require("../middleware/auth.js");
const { uploadImage } = require("../middleware/uploadImage.js");

const router = express.Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================
const createValidation = [
  body('productId').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('price').isNumeric(),
  body('brandId').isNumeric(),
  body('categoryId').isNumeric(), // Renamed from productTypeId
];

const updateValidation = [
  body('productId').optional().isString().notEmpty(),
  body('name').optional().isString().notEmpty(),
  body('price').optional().isNumeric(),
  body('brandId').optional().isNumeric(),
  body('categoryId').optional().isNumeric(),
];

const paginationValidation = [
    query('limit').optional().isNumeric().toInt(),
    query('page').optional().isNumeric().toInt(),
];

const createInventoryValidation = [
  body('sizeId', 'A numeric sizeId is required').isNumeric(),
  body('quantity', 'Quantity must be a non-negative number').isNumeric({ no_symbols: true }),
];

const createFeedbackValidation = [
    body('orderId', 'A numeric orderId is required').isNumeric(),
    body('sizeId', 'A numeric sizeId is required').isNumeric(),
    body('rating', 'Rating is required and must be a number between 1 and 5').isInt({ min: 1, max: 5 }),
    body('description', 'Description must be a string').optional().isString(),
];

// ===============================================================
// --- PUBLIC ROUTES (No Auth Required) ---
// ===============================================================

router.get("/", paginationValidation, handleGetAllProducts);
router.get("/on-sale", paginationValidation, handleGetAllProductsOnSale);

router.get(
  "/category/:categoryId",
  [param('categoryId').isNumeric()],
  handleGetAllProductsByCategory
);

router.get(
  "/:productId", // Using the business key for public-facing URLs
  [param('productId').isString().notEmpty()],
  handleGetProductDetails
);

// ===============================================================
// --- NESTED FEEDBACK ROUTES ---
// ===============================================================

router.route('/:productId/feedback')
  /**
   * @route   GET /api/products/:productId/feedback
   * @desc    Get all feedback for a specific product
   * @access  Public
   */
  .get(
      param('productId').isNumeric(),
      handleGetAllFeedbackForProduct
  )
  /**
   * @route   POST /api/products/:productId/feedback
   * @desc    Create new feedback for a specific product
   * @access  Private (User)
   */
  .post(
      protect,
      param('productId').isNumeric(),
      createFeedbackValidation,
      handleCreateFeedback
  );

// ===============================================================
// --- NESTED INVENTORY ROUTES ---
// ===============================================================

/**
 * @route   GET /api/products/:productId/inventory
 * @desc    Get all inventory entries for a specific product
 * @access  Public
 */
router.get(
  '/:productId/inventory',
  param('productId').isNumeric(),
  handleGetInventoryForProduct
);

/**
 * @route   POST /api/products/:productId/inventory
 * @desc    Create a new inventory entry for a specific product
 * @access  Private (Admin)
 */
router.post(
  '/:productId/inventory',
  protect,
  isAdmin,
  param('productId').isNumeric(),
  createInventoryValidation,
  handleCreateInventoryEntry
);

// ===============================================================
// --- ADMIN-ONLY ROUTES (Requires Auth and Admin Role) ---
// ===============================================================

// This middleware applies to all subsequent routes in this file.
router.use(protect, isAdmin);

// Create a new product
router.post(
  "/",
  uploadImage.single('image'),
  createValidation,
  handleCreateProduct
);

// Update a product by its numeric primary key
router.put(
  "/:id",
  uploadImage.single('image'),
  [param('id').isNumeric()],
  updateValidation,
  handleUpdateProduct
);

// Delete a product by its numeric primary key
router.delete(
  "/:id",
  [param('id').isNumeric()],
  handleDeleteProduct
);

module.exports = router;
