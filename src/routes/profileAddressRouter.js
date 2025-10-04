/**
 * @fileoverview Defines routes for the logged-in user to manage their own addresses.
 * Intended to be mounted under `/api/profile/addresses`.
 */
const { Router } = require('express');
const { body } = require('express-validator');
const {
  handleCreateAddress,
  handleGetAddressesForUser,
} = require('../controllers/deliveryAddressController.js');

const router = Router();

const addressValidation = [ 
    body('receiverName', 'Receiver name is required').isString().notEmpty(),
    body('phone', 'Phone number is required').isString().notEmpty(),
    body('streetLine1', 'Street address is required').isString().notEmpty(),
    body('city', 'City is required').isString().notEmpty(),
    body('postalCode', 'Postal code is required').isString().notEmpty(),
    body('country', 'Country is required').isString().notEmpty(),
 ];

router.route('/')
  .get(handleGetAddressesForUser)
  .post(addressValidation, handleCreateAddress);

module.exports = router;