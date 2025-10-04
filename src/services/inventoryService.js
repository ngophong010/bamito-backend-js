const { Inventory, Product, Size } = require("../models");

/**
 * Creates a new inventory entry for a specific product and size.
 * Throws an error if an entry for this combination already exists.
 * @param {object} data The data for the new inventory entry.
 * @param {number} data.productId The product's ID.
 * @param {number} data.sizeId The size's ID.
 * @param {number} data.quantity The stock quantity.
 * @returns {Promise<import('../../models/inventory')>} The newly created inventory instance.
 */
const createInventoryEntry = async (data) => {
  const { productId, sizeId, quantity } = data;
  if (productId == null || sizeId == null || quantity == null) {
    throw new Error("Missing required parameters: productId, sizeId, and quantity are required.");
  }

  try {
    // The unique constraint in the model definition will cause Sequelize to throw an error
    // if this product/size combination already exists.
    return await Inventory.create({
      productId,
      sizeId,
      quantity,
      sold: 0, // Always initialize sold count to 0
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("This product and size combination already has an inventory entry.");
    }
    throw error;
  }
};

/**
 * Retrieves a paginated list of all inventory entries for a specific product.
 * @param {number} productId The primary key ID of the product.
 * @param {number} [limit=10] Items per page.
 * @param {number} [page=1] The current page.
 * @param {string} [sort='id,desc'] Sort order, e.g., 'quantity,asc'.
 * @returns {Promise<object>} A paginated object of inventory entries.
 */
const getInventoryForProduct = async (
  productId,
  limit,
  page,
  sort
) => {
  if (!productId) {
    throw new Error("Missing required parameter: productId is required.");
  }

  const effectiveLimit = limit || 10;
  const effectivePage = page || 1;
  const offset = (effectivePage - 1) * effectiveLimit;
  
  const [sortField, sortOrder] = sort ? sort.split(',') : ['id', 'desc'];

  // Use Sequelize's findAndCountAll for efficient pagination
  const { count, rows } = await Inventory.findAndCountAll({
    where: { productId },
    limit: effectiveLimit,
    offset: offset,
    order: [[sortField, sortOrder]],
    include: [
      // Include related data with specific attributes
      {
        model: Product,
        as: 'product',
        attributes: ['productId', 'name'],
      },
      {
        model: Size,
        as: 'size',
        attributes: ['sizeId', 'name'],
      }
    ],
    attributes: ['id', 'quantity', 'sold'], // Select fields from the Inventory model itself
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / effectiveLimit),
    currentPage: effectivePage,
    inventory: rows, // Use the clearer name in the response
  };
};

/**
 * Updates an inventory entry. Throws an error if not found or if the new
 * productId/sizeId combination conflicts with an existing entry.
 * @param {number} id The ID of the inventory entry to update.
 * @param {object} data The new data for the entry.
 * @returns {Promise<import('../../models/inventory')>} The updated inventory instance.
 */
const updateInventoryEntry = async (id, data) => {
  try {
    const [affectedRows, updatedEntries] = await Inventory.update(data, {
      where: { id },
      returning: true, // Crucial to get the updated object back
    });

    if (affectedRows === 0) {
      throw new Error("Inventory entry not found.");
    }

    return updatedEntries[0];
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("Another inventory entry for this product and size already exists.");
    }
    throw error;
  }
};

/**
 * Deletes an inventory entry by its primary key ID.
 * @param {number} id The ID of the inventory entry to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the inventory entry is not found.
 */
const deleteInventoryEntry = async (id) => {
  const deletedRows = await Inventory.destroy({
    where: { id },
  });

  if (deletedRows === 0) {
    throw new Error("Inventory entry not found.");
  }

  return deletedRows;
};

module.exports = {
  createInventoryEntry,
  getInventoryForProduct,
  updateInventoryEntry,
  deleteInventoryEntry,
};
