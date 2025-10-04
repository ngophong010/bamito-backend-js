/**
 * @fileoverview Defines routes for acting on a specific address by its ID.
 * Intended to be mounted under `/api/addresses`.
 */
const { Router } = require('express');
const { param } = require('express-validator');
const {
  handleUpdateAddress,
  handleDeleteAddress,
  handleSetAddressAsDefault,
} = require('../controllers/deliveryAddressController.js');
const { protect, isAddressOwner } = require('../middleware/auth.js');

const router = Router();

router.use(protect); // All these routes require authentication

const idParamValidation = [ /* ... your validation rule ... */ ];

router.route('/:id')
  .put(isAddressOwner, idParamValidation, handleUpdateAddress)
  .delete(isAddressOwner, idParamValidation, handleDeleteAddress);

router.patch('/:id/set-default', isAddressOwner, idParamValidation, handleSetAddressAsDefault);

// This file now exports ONLY ONE router.
module.exports = router;