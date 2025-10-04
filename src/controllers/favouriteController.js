const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');

const {
  addProductToFavourites,
  removeProductFromFavourites,
  getFavouritedProductIds,
  getFavouritedProducts,
  getFavouritedProductsByUser,
} = require("../services/favouriteService.js");

/**
 * @desc    Add a product to the logged-in user's favourites
 * @route   POST /api/profile/favourites
 * @access  Private (User)
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleAddFavourite = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }

  // CRITICAL: Get userId from the authenticated token, not the request body.
  // An authentication middleware should ensure req.user exists.
  const userId = req.user.id;
  const { productId } = req.body;

  const newFavourite = await addProductToFavourites(userId, productId);
  res.status(201).json({ status: "success", data: newFavourite });
});

/**
 * @desc    Get a paginated list of full favourite products for the logged-in user
 * @route   GET /api/profile/favourites
 * @access  Private (User)
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetFavouritedProducts = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit, page } = req.query;

    const favouritesData = await getFavouritedProducts(
        userId,
        limit ? Number(limit) : undefined,
        page ? Number(page) : undefined
    );
    res.status(200).json({ status: "success", data: favouritesData });
});

/**
 * @desc    Get all favourite product IDs for the logged-in user
 * @route   GET /api/profile/favourites/ids
 * @access  Private (User)
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetFavouritedProductIds = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const favouriteIds = await getFavouritedProductIds(userId);
  res.status(200).json({ status: "success", data: favouriteIds });
});

/**
 * @desc    [ADMIN] Get a paginated list of favourite products for a specific user
 * @route   GET /api/users/:userId/favourites
 * @access  Private (Admin)
 * @param {import('express').Request} req The Express request object.
 * @param {import('express').Response} res The Express response object.
 */
const handleGetFavouritedProductsByUser = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    const { limit, page } = req.query;

    const favouritesData = await getFavouritedProductsByUser(
        userId,
        limit ? Number(limit) : undefined,
        page ? Number(page) : undefined
    );
    res.status(200).json({ status: "success", data: favouritesData });
});

/**
 * @desc    Remove a product from the logged-in user's favourites
 * @route   DELETE /api/profile/favourites/:productId
 * @access  Private (User)
 * @param {import('express').Request & { user?: { id: number } }} req The Express request object, augmented with a user property.
 * @param {import('express').Response} res The Express response object.
 */
const handleRemoveFavourite = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: "fail", data: errors.mapped() });
  }

  const userId = req.user.id;
  const productId = Number(req.params.productId);

  await removeProductFromFavourites(userId, productId);
  // Per JSend spec, DELETE can return success with null data. 204 is also a valid REST pattern.
  res.status(200).json({ status: "success", data: null });
});

module.exports = {
  handleAddFavourite,
  handleGetFavouritedProducts,
  handleGetFavouritedProductIds,
  handleGetFavouritedProductsByUser,
  handleRemoveFavourite,
};