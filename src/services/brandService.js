const { Op } = require("sequelize");
const { Brand } = require("../models");

/**
 * Creates a new brand. Throws an error if the brandId or brandName already exist.
 * @param {object} data The data for the new brand (e.g., { brandId, brandName }).
 * @returns {Promise<import('../../models/brand')>} The newly created brand instance.
 * @throws {Error} If required parameters are missing or if a unique constraint is violated.
 */
const createBrand = async (data) => {
  if (!data.brandId || !data.name) {
    throw new Error("Missing required parameters: brandId and brandName are required.");
  }
  
  try {
    // Sequelize's .create method will automatically throw a SequelizeUniqueConstraintError
    // if the brandId or brandName already exist, which is more reliable than a manual check.
    const newBrand = await Brand.create(data);
    return newBrand;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Provide a more user-friendly error message
      const field = error.errors[0].path; // e.g., 'brandId' or 'brandName'
      throw new Error(`${field} already exists.`);
    }
    // Re-throw other unexpected errors
    throw error;
  }
};

/**
 * Retrieves all brands or a paginated list of brands.
 * Can be filtered by name and sorted.
 * @param {number} [limit=10] The number of items per page.
 * @param {number} [page=1] The current page number.
 * @param {string} [sort='id,desc'] The sort order, e.g., 'brandName,asc'.
 * @param {string} [name] A search term to filter brands by name (case-insensitive).
 * @param {boolean} [pagination=true] Whether to apply pagination.
 * @returns {Promise<object|import('../../models/brand')[]>} A paginated object or an array of brands.
 */
const getAllBrands = async (
  limit,
  page,
  sort,
  name,
  pagination = true
) => {
  const options = {
    attributes: ['id', 'brandId', 'name'], // Equivalent to Prisma's 'select'
  };

  if (!pagination) {
    return Brand.findAll(options);
  }

  const effectiveLimit = limit || 10;
  const effectivePage = page || 1;
  const offset = (effectivePage - 1) * effectiveLimit;

  // Build the 'where' clause for filtering
  if (name) {
    options.where = {
        [Op.iLike]: `%${name}%`, // Case-insensitive 'LIKE' search
    };
  }

  // Build the 'order' clause for sorting
  const [sortField, sortOrder] = sort ? sort.split(',') : ['id', 'desc'];
  options.order = [[sortField, sortOrder]];

  // Use Sequelize's findAndCountAll for efficient pagination
  const { count, rows } = await Brand.findAndCountAll({
    ...options,
    limit: effectiveLimit,
    offset: offset,
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / effectiveLimit),
    currentPage: effectivePage,
    brands: rows,
  };
};

/**
 * Updates a brand's data.
 * @param {number} id The primary key ID of the brand to update.
 * @param {object} data The new data for the brand.
 * @returns {Promise<import('../../models/brand')>} The updated brand instance.
 * @throws {Error} If the brand is not found or if the update violates a unique constraint.
 */
const updateBrand = async (id, data) => {
  try {
    const [affectedRows, updatedBrands] = await Brand.update(data, {
      where: { id },
      returning: true, // Important: This returns the updated record(s)
    });
  
    if (affectedRows === 0) {
      throw new Error("Brand not found.");
    }
  
    return updatedBrands[0];
  } catch (error) {
     if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      throw new Error(`${field} already exists.`);
    }
    throw error;
  }
};

/**
 * Deletes a brand by its primary key ID.
 * @param {number} id The ID of the brand to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the brand is not found.
 */
const deleteBrand = async (id) => {
  // Sequelize's destroy method returns the number of rows deleted.
  const deletedRows = await Brand.destroy({ where: { id } });

  if (deletedRows === 0) {
    throw new Error("Brand not found.");
  }

  return deletedRows;
};

module.exports = {
  createBrand,
  getAllBrands,
  updateBrand,
  deleteBrand,
};
