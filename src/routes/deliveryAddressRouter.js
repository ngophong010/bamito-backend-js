/**
 * @fileoverview This file defines the routes for delivery addresses.
 * It exports two separate routers to handle different access patterns:
 * 1. profileRouter: For actions on the user's own collection of addresses (e.g., GET all, POST new).
 * 2. addressRouter: For actions on a specific address by its ID (e.g., PUT, DELETE).
 * This separation allows for cleaner mounting in the main application router.
 */

const { Router } = require('express');
const { body, param } = require('express-validator');

const {
  handleCreateAddress,
  handleDeleteAddress,
  handleUpdateAddress,
  handleGetAddressesForUser,
  handleSetAddressAsDefault,
} = require('../controllers/deliveryAddressController.js');
const { protect, isAddressOwner } = require('../middleware/auth.js'); // `isAddressOwner` is a required middleware

const profileRouter = Router();
const addressRouter = Router();

// ===============================================================
// --- VALIDATION CHAINS ---
// ===============================================================

// Validation middleware for creating or updating an address
const addressValidation = [
  body('receiverName', 'Receiver name is required').isString().notEmpty(),
  body('phone', 'Phone number is required').isString().notEmpty(),
  body('streetLine1', 'Street address is required').isString().notEmpty(),
  body('city', 'City is required').isString().notEmpty(),
  body('postalCode', 'Postal code is required').isString().notEmpty(),
  body('country', 'Country is required').isString().notEmpty(),
];

// Validation middleware for checking the ID in the URL parameter
const idParamValidation = [
  param('id', 'A numeric address ID is required').isNumeric(),
];

// ===============================================================
// --- ROUTES FOR THE USER'S COLLECTION OF ADDRESSES ---
// ===============================================================
// These routes are intended to be mounted under `/api/profile/addresses`
profileRouter.use(protect); // All profile routes require a user to be logged in

profileRouter.route('/')
  /**
   * @route   GET /api/profile/addresses
   * @desc    Get all of the logged-in user's addresses
   */
  .get(handleGetAddressesForUser)
  /**
   * @route   POST /api/profile/addresses
   * @desc    Add a new address to the logged-in user's address book
   */
  .post(addressValidation, handleCreateAddress);


// ===============================================================
// --- ROUTES FOR A SPECIFIC ADDRESS ENTRY ---
// ===============================================================
// These routes are intended to be mounted under `/api/addresses`
addressRouter.use(protect); // All direct address actions require login

addressRouter.route('/:id')
  /**
   * @route   PUT /api/addresses/:id
   * @desc    Update a specific address
   * @access  Private (Owner)
   */
  .put(isAddressOwner, idParamValidation, addressValidation, handleUpdateAddress)
  /**
   * @route   DELETE /api/addresses/:id
   * @desc    Delete a specific address
   * @access  Private (Owner)
   */
  .delete(isAddressOwner, idParamValidation, handleDeleteAddress);

/**
 * @route   PATCH /api/addresses/:id/set-default
 * @desc    Set a specific address as the default for the logged-in user
 * @access  Private (Owner)
 */
addressRouter.patch(
  '/:id/set-default',
  isAddressOwner,
  idParamValidation,
  handleSetAddressAsDefault
);

module.exports = { profileRouter, addressRouter };
