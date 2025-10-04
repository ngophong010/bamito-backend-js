const { v2: cloudinary } = require('cloudinary');
const { Op } = require("sequelize");
const { Voucher } = require("../models");

/**
 * Creates a new voucher. Throws an error if the voucherId already exists.
 * @param {object} data The data for the new voucher.
 * @returns {Promise<import('../../models/voucher')>} The newly created voucher instance.
 */
const createVoucher = async (data) => {
  if (!data.voucherId || data.voucherPrice == null || data.quantity == null || !data.timeStart || !data.timeEnd) {
    throw new Error("Missing required parameters!");
  }

  try {
    // Let Sequelize's unique constraint in the DB model handle the check.
    return await Voucher.create(data);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("A voucher with this ID already exists.");
    }
    throw error;
  }
};

/**
 * Retrieves a list of all vouchers. Can be paginated for admin use.
 * @param {number} [limit=10] Items per page.
 * @param {number} [page=1] The current page.
 * @param {string} [sort='id,desc'] Sort order, e.g., 'voucherPrice,asc'.
 * @param {string} [name] A search term to filter by voucherId.
 * @param {boolean} [pagination=true] Toggles pagination.
 * @returns {Promise<object|import('../../models/voucher')[]>} A paginated object or an array of vouchers.
 */
const getAllVouchers = async (
  limit,
  page,
  sort,
  name,
  pagination = true
) => {
  const options = {
    attributes: ['id', 'voucherId', 'voucherPrice', 'quantity', 'timeStart', 'timeEnd', 'image'],
  };
  
  if (!pagination) {
    return Voucher.findAll(options);
  }

  const effectiveLimit = limit || 10;
  const effectivePage = page || 1;
  const offset = (effectivePage - 1) * effectiveLimit;
  
  const where = {};
  if (name) {
    where.voucherId = { [Op.iLike]: `%${name}%` };
  }

  const [sortField, sortOrder] = sort ? sort.split(',') : ['id', 'desc'];
  
  const { count, rows } = await Voucher.findAndCountAll({
    ...options,
    where,
    limit: effectiveLimit,
    offset,
    order: [[sortField, sortOrder]],
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / effectiveLimit),
    currentPage: effectivePage,
    vouchers: rows,
  };
};

/**
 * Retrieves all currently active vouchers for end-users.
 * An active voucher is within its date range and has a quantity greater than 0.
 * @returns {Promise<import('../../models/voucher')[]>} An array of active vouchers.
 */
const getActiveVouchersForUser = async () => {
  const now = new Date();
  
  return Voucher.findAll({
    where: {
      timeStart: { [Op.lte]: now }, // lte = less than or equal to
      timeEnd:   { [Op.gte]: now }, // gte = greater than or equal to
      quantity:  { [Op.gt]: 0 },   // gt = greater than
    },
    attributes: ['id', 'voucherId', 'voucherPrice', 'quantity', 'timeStart', 'timeEnd', 'image'],
  });
};

/**
 * Updates a voucher's data. Throws an error if not found or if the new voucherId conflicts.
 * @param {number} id The ID of the voucher to update.
 * @param {object} data The new data for the voucher.
 * @returns {Promise<import('../../models/voucher')>} The updated voucher instance.
 */
const updateVoucher = async (id, data) => {
  const voucherToUpdate = await Voucher.findByPk(id);
  if (!voucherToUpdate) {
    throw new Error("Voucher not found.");
  }

  // If a new image is being uploaded (identified by a new imageId) and an old one exists,
  // delete the old one from Cloudinary.
  if (data.imageId && voucherToUpdate.imageId) {
    await cloudinary.uploader.destroy(voucherToUpdate.imageId);
  }

  try {
    const [affectedRows, updatedVouchers] = await Voucher.update(data, {
      where: { id },
      returning: true, // Crucial to get the updated object back
    });

    if (affectedRows === 0) {
      // This case is already handled by the findByPk check above, but it's good practice.
      throw new Error("Voucher not found during update.");
    }
    
    return updatedVouchers[0];
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("Another voucher with this ID already exists.");
    }
    throw error;
  }
};

/**
 * Deletes a voucher by its primary key ID. Also deletes the associated image from Cloudinary.
 * @param {number} id The ID of the voucher to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 */
const deleteVoucher = async (id) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) {
    throw new Error("Voucher not found.");
  }

  // If there's an image, destroy it on Cloudinary first.
  if (voucher.imageId) {
    await cloudinary.uploader.destroy(voucher.imageId);
  }

  // Now delete the voucher record from the database.
  const deletedRows = await Voucher.destroy({ where: { id } });
  
  return deletedRows;
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getActiveVouchersForUser,
  updateVoucher,
  deleteVoucher,
};