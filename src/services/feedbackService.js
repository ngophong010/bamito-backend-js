const { Sequelize } = require("sequelize");
const { sequelize, Feedback, OrderHistory, User } = require("../models");

/**
 * Creates new feedback for a product and marks the corresponding order item as reviewed.
 * This is a transactional operation.
 * @param {object} data The data for the new feedback.
 * @param {number} data.userId The user's ID.
 * @param {number} data.productId The product's ID.
 * @param {number} data.orderId The order's ID.
 * @param {number} data.sizeId The size's ID.
 * @param {string|null} data.description The feedback text.
 * @param {number} data.rating The rating from 1-5.
 * @returns {Promise<import('../../models/feedback')>} The newly created feedback instance.
 */
const createFeedback = async (data) => {
  const { userId, productId, orderId, sizeId, description, rating } = data;
  if (!userId || !productId || !orderId || !sizeId || rating == null) {
    throw new Error("Missing required parameters!");
  }

  try {
    // Use a managed transaction to ensure both operations succeed or both fail.
    return await sequelize.transaction(async (t) => {
      // Step 1: Create the new feedback record.
      // A unique constraint on [userId, productId] in the model will throw an error if a review already exists.
      const newFeedback = await Feedback.create({
        userId,
        productId,
        description,
        rating,
      }, { transaction: t });

      // Step 2: Update the specific order history item to mark it as reviewed.
      // Sequelize's update returns an array with the number of affected rows.
      const [updateCount] = await OrderHistory.update({
        statusFeedback: 1, // 1 = reviewed
      }, {
        where: {
          orderId,
          productId,
          sizeId,
          // Assuming an association allows this check, otherwise you might need another query.
          // For simplicity, we trust the orderId belongs to the user, which should be verified by middleware.
        },
        transaction: t,
      });

      // If the update affected 0 rows, it means the order item wasn't found.
      // We must throw an error to roll back the transaction.
      if (updateCount === 0) {
        throw new Error("Corresponding order history item not found. Rolling back.");
      }

      return newFeedback;
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("You have already submitted feedback for this product.");
    }
    // Re-throw other errors (like the "not found" error from above)
    throw error;
  }
};

/**
 * Retrieves all feedback for a specific product, including user details.
 * @param {number} productId The ID of the product.
 * @returns {Promise<import('../../models/feedback')[]>} An array of feedback instances.
 */
const getAllFeedbackForProduct = async (productId) => {
  if (!productId) {
    throw new Error("Missing required product ID!");
  }

  return Feedback.findAll({
    where: { productId },
    include: [{
      model: User,
      as: 'user', // Make sure this alias matches your association definition
      attributes: ['userName', 'email', 'avatar'], // Select only the fields you want to expose.
    }],
    order: [[Sequelize.col('updated_at'), 'DESC']],
  });
};

/**
 * Updates the text and rating of an existing feedback entry.
 * @param {number} id The ID of the feedback to update.
 * @param {object} data The new data for the feedback (e.g., { description, rating }).
 * @returns {Promise<import('../../models/feedback')>} The updated feedback instance.
 * @throws {Error} If the feedback is not found.
 */
const updateFeedback = async (id, data) => {
  const [affectedRows, updatedFeedback] = await Feedback.update(data, {
    where: { id },
    returning: true, // Crucial to get the updated object back
  });

  if (affectedRows === 0) {
    throw new Error("Feedback not found.");
  }

  return updatedFeedback[0];
};

/**
 * Deletes a feedback entry by its primary key ID.
 * @param {number} id The ID of the feedback to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the feedback is not found.
 */
const deleteFeedback = async (id) => {
  const deletedRows = await Feedback.destroy({
    where: { id },
  });

  if (deletedRows === 0) {
    throw new Error("Feedback not found.");
  }

  return deletedRows;
};

module.exports = {
  createFeedback,
  getAllFeedbackForProduct,
  updateFeedback,
  deleteFeedback,
};
