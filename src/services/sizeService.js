const { Op } = require("sequelize");
const { Size, Category } = require("../models");

/**
 * Creates a new size. Throws an error if the sizeId is not unique,
 * or if the sizeName is not unique for the given categoryId.
 * @param {object} data The data for the new size.
 * @returns {Promise<import('../../models/size')>} The newly created size instance.
 */
const createSize = async (data) => {
  const { sizeId, sizeName, categoryId } = data;
  if (!sizeId || !sizeName || !categoryId) {
    throw new Error("Missing required parameters: sizeId, sizeName, and categoryId are required.");
  }

  try {
    // Let Sequelize's unique constraints in the DB model handle the checks.
    return await Size.create({ sizeId, sizeName, categoryId });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Inspect the error to provide a specific message
      const field = error.errors[0].path;
      if (field === 'sizeId') {
        throw new Error("sizeId already exists.");
      }
      // This assumes the composite key index is named 'sizes_product_type_id_size_name' or similar
      if (field.includes('categoryId') && field.includes('sizeName')) {
         throw new Error(`Size Name "${sizeName}" already exists for this product type.`);
      }
    }
    // Re-throw any other unexpected errors.
    throw error;
  }
};

/**
 * Retrieves a paginated and filterable list of all sizes.
 * @param {number} [limit=10] Items per page.
 * @param {number} [page=1] The current page.
 * @param {string} [sort='id,desc'] Sort order, e.g., 'sizeName,asc'.
 * @param {string} [name] A search term to filter by sizeName.
 * @returns {Promise<object>} A paginated object of sizes.
 */
const getAllSizes = async (
  limit,
  page,
  sort,
  name
) => {
  const effectiveLimit = limit || 10;
  const effectivePage = page || 1;
  const offset = (effectivePage - 1) * effectiveLimit;
  
  const where = {};
  if (name) {
    where.name = { [Op.iLike]: `%${name}%` };
  }

  const [sortField, sortOrder] = sort ? sort.split(',') : ['id', 'desc'];
  
  // Use Sequelize's findAndCountAll for efficient pagination with includes
  const { count, rows } = await Size.findAndCountAll({
    where,
    limit: effectiveLimit,
    offset,
    order: [[sortField, sortOrder]],
    include: [{
        model: Category,
        as: 'category', // Ensure this alias matches your association
        attributes: ['categoryId', 'name']
    }],
    attributes: ['id', 'sizeId', 'name'],
    distinct: true, // Important for correct counting with includes
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / effectiveLimit),
    currentPage: effectivePage,
    sizes: rows,
  };
};

/**
 * Retrieves all sizes that belong to a specific product type (category).
 * @param {number} categoryId The primary key ID of the product type.
 * @returns {Promise<import('../../models/size')[]>} An array of sizes.
 */
const getAllSizesByCategory = async (categoryId) => {
  if (!categoryId) {
    throw new Error("Missing required parameter: categoryId is required.");
  }

  return Size.findAll({
    where: { categoryId },
    attributes: ['id', 'sizeId', 'sizeName'],
    order: [['sizeName', 'ASC']],
  });
};

/**
 * Updates a size's data. Throws an error if not found or if data violates unique constraints.
 * @param {number} id The ID of the size to update.
 * @param {object} data The new data for the size.
 * @returns {Promise<import('../../models/size')>} The updated size instance.
 */
const updateSize = async (id, data) => {
  try {
    const [affectedRows, updatedSizes] = await Size.update(data, {
      where: { id },
      returning: true, // Crucial to get the updated object back
    });

    if (affectedRows === 0) {
      throw new Error("Size not found.");
    }

    return updatedSizes[0];
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Provide a generic but helpful message for update conflicts
      throw new Error("The updated data conflicts with an existing size.");
    }
    throw error;
  }
};

/**
 * Deletes a size by its primary key ID. Throws an error if not found.
 * @param {number} id The ID of the size to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 */
const deleteSize = async (id) => {
  const deletedRows = await Size.destroy({
    where: { id },
  });

  if (deletedRows === 0) {
    throw new Error("Size not found.");
  }

  return deletedRows;
};

module.exports = {
  createSize,
  getAllSizes,
  getAllSizesByCategory,
  updateSize,
  deleteSize,
};
