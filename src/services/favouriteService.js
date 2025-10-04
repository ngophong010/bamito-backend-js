const { sequelize, Favourite, Product, Brand, Category, Feedback, User } = require("../models");

/**
 * Adds a product to a user's favourites list.
 * Throws an error if the product is already in their favourites.
 * @param {number} userId The ID of the user.
 * @param {number} productId The ID of the product.
 * @returns {Promise<import('../../models/favourite')>} The newly created favourite instance.
 * @throws {Error} If required parameters are missing or the item is already a favourite.
 */
const addProductToFavourites = async (userId, productId) => {
  if (!userId || !productId) {
    throw new Error("Missing required parameters: userId and productId are required.");
  }

  try {
    // The unique constraint on the Favourite model will handle duplicates automatically.
    const newFavourite = await Favourite.create({ userId, productId });
    return newFavourite;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("This product is already in your favourites.");
    }
    throw error;
  }
};

/**
 * A private helper function to get favourited products for a given user ID.
 * This reduces code duplication between the user-facing and admin-facing functions.
 * @private
 * @param {number} userId The ID of the user.
 * @param {number} limit The number of items per page.
 * @param {number} page The current page number.
 * @returns {Promise<object>} A paginated object of products.
 */
const _getFavouritedProductsForUserId = async (userId, limit = 12, page = 1) => {
    const offset = (page - 1) * limit;

    // Use findAndCountAll to get products and total count in one go.
    const { count, rows } = await Product.findAndCountAll({
        limit,
        offset,
        order: [['id', 'DESC']],
        // We select products by including the Favourite model and filtering by userId
        include: [
            {
                model: Favourite,
                as: 'favouritedBy',
                where: { userId },
                attributes: [], // Don't include Favourite fields in the result
                required: true, // This makes it an INNER JOIN
            },
            { model: Brand, as: 'brand', attributes: ['brandId', 'name'] },
            { model: Category, as: 'category', attributes: ['categoryId', 'name'] },
            // We include Feedback model only for the purpose of the aggregation
            { model: Feedback, as: 'feedbacks', attributes: [] }
        ],
        attributes: {
            // Include all attributes of the Product model
            include: [
                // Add a calculated 'rating' attribute using a database aggregate function
                [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('feedbacks.rating')), 1), 'rating']
            ]
        },
        group: ['Product.id', 'brand.id', 'category.id'], // Group by to make the AVG work correctly
        subQuery: false, // Important for correct LIMIT/OFFSET with includes and groups
    });

    return {
        // The count from findAndCountAll on grouped queries can be an array of objects.
        // We need the total number of unique groups.
        totalItems: Array.isArray(count) ? count.length : count,
        totalPages: Math.ceil((Array.isArray(count) ? count.length : count) / limit),
        currentPage: page,
        products: rows,
    };
}


/**
 * Gets a paginated list of a user's favourite products with full details and average ratings.
 * @param {number} userId The ID of the user.
 * @param {number} limit The number of items per page.
 * @param {number} page The current page number.
 */
const getFavouritedProducts = async (userId, limit, page) => {
  if (!userId) {
    throw new Error("Missing required userId parameter!");
  }
  return _getFavouritedProductsForUserId(userId, limit, page);
};


/**
 * Gets a simple array of all product IDs favourited by a user.
 * Ideal for quick checks (e.g., "is this product favourited?").
 * @param {number} userId The ID of the user.
 * @returns {Promise<number[]>} An array of numbers (product IDs).
 */
const getFavouritedProductIds = async (userId) => {
  if (!userId) {
    throw new Error("Missing required user ID!");
  }

  const favourites = await Favourite.findAll({
    where: { userId },
    attributes: ['productId'], // This is Sequelize's equivalent of "pluck"
  });

  return favourites.map(f => f.productId);
};

/**
 * [ADMIN] Gets a paginated list of a specific user's favourite products.
 * @param {number} userId The ID of the user whose favourites are being requested.
 * @param {number} limit The number of items per page.
 * @param {number} page The current page number.
 */
const getFavouritedProductsByUser = async (userId, limit, page) => {
  if (!userId) {
    throw new Error("Missing required parameter: userId is required.");
  }
  // This function now just calls the shared private helper
  return _getFavouritedProductsForUserId(userId, limit, page);
};

/**
 * Removes a product from a user's favourites list.
 * Throws an error if the favourite entry is not found.
 * @param {number} userId The ID of the user.
 * @param {number} productId The ID of the product.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 */
const removeProductFromFavourites = async (userId, productId) => {
  if (!userId || !productId) {
    throw new Error("Missing required parameters: userId and productId are required.");
  }

  // Use the composite key in the where clause to identify the record to delete.
  const deletedRows = await Favourite.destroy({
    where: { userId, productId },
  });

  if (deletedRows === 0) {
      throw new Error("Favourite entry not found.");
  }

  return deletedRows;
};

module.exports = {
  addProductToFavourites,
  getFavouritedProducts,
  getFavouritedProductIds,
  getFavouritedProductsByUser,
  removeProductFromFavourites,
};
