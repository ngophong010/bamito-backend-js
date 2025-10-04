const { Op } = require("sequelize");
const { Category } = require("../models");

/**
 * Creates a new category. Throws an error if the categoryId or name already exist.
 * @param {object} data The data for the new category (e.g., { categoryId, name }).
 * @returns {Promise<import('../../models/category')>} The newly created category instance.
 * @throws {Error} If required parameters are missing or a unique constraint is violated.
 */
const createCategory = async (data) => {
  if (!data.categoryId || !data.name) {
    throw new Error("Missing required parameters: categoryId and name are required.");
  }

  try {
    // Let Sequelize's unique constraint handling in the DB do the work.
    // This is more atomic and safer than a manual pre-check.
    const newCategory = await Category.create(data);
    return newCategory;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Extract the field that caused the error for a better message.
      const field = error.errors[0].path;
      throw new Error(`A category with this ${field} already exists.`);
    }
    // Re-throw any other unexpected errors.
    throw error;
  }
};

/**
 * Retrieves all categories, with optional pagination.
 * @param {number} [limit=10] Items per page.
 * @param {number} [page=1] The current page.
 * @param {string} [sort='id,desc'] Sort order, e.g., 'name,asc'.
 * @param {string} [name] A search term to filter by name.
 * @param {boolean} [pagination=true] Toggles pagination.
 * @returns {Promise<object|import('../../models/category')[]>} A paginated object or an array of categories.
 */
const getAllCategories = async (
  limit,
  page,
  sort,
  name,
  pagination = true
) => {
  const options = {
    attributes: ['id', 'categoryId', 'name'], // Equivalent to Prisma's 'select'
  };

  if (!pagination) {
    options.order = [['name', 'ASC']];
    return Category.findAll(options);
  }

  const effectiveLimit = limit || 10;
  const effectivePage = page || 1;
  const offset = (effectivePage - 1) * effectiveLimit;
  
  // Build the 'where' clause for filtering
  if (name) {
    options.where = {
      name: { [Op.iLike]: `%${name}%` }, // Case-insensitive LIKE
    };
  }

  // Build the 'order' clause for sorting
  const [sortField, sortOrder] = sort ? sort.split(',') : ['id', 'desc'];
  options.order = [[sortField, sortOrder]];
  
  // Use Sequelize's findAndCountAll for efficient pagination
  const { count, rows } = await Category.findAndCountAll({
    ...options,
    limit: effectiveLimit,
    offset: offset,
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / effectiveLimit),
    currentPage: effectivePage,
    categories: rows,
  };
};

/**
 * Retrieves a single category by its unique business ID (categoryId).
 * @param {string} categoryId The business-logic ID of the category.
 * @returns {Promise<import('../../models/category')|null>} The category object or null if not found.
 */
const getCategoryById = async (categoryId) => {
  if (!categoryId) {
    throw new Error("Missing required parameter: categoryId is required.");
  }
  return Category.findOne({
    where: { categoryId },
    attributes: ['categoryId', 'name'],
  });
};

/**
 * Updates a category's data. Throws an error if not found or if data violates unique constraints.
 * @param {number} id The primary key ID of the category to update.
 * @param {object} data The new data for the category.
 * @returns {Promise<import('../../models/category')>} The updated category instance.
 */
const updateCategory = async (id, data) => {
  try {
    const [affectedRows, updatedCategories] = await Category.update(data, {
      where: { id },
      returning: true, // This is crucial to get the updated object back
    });

    if (affectedRows === 0) {
      throw new Error("Category not found.");
    }
    
    return updatedCategories[0];
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      throw new Error(`A category with this ${field} already exists.`);
    }
    throw error;
  }
};

/**
 * Deletes a category by its primary key ID.
 * @param {number} id The ID of the category to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the category is not found.
 */
const deleteCategory = async (id) => {
  // Sequelize's 'destroy' method returns the number of rows deleted.
  const deletedRows = await Category.destroy({ where: { id } });

  if (deletedRows === 0) {
    throw new Error("Category not found.");
  }

  return deletedRows;
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
