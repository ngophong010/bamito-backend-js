/**
 * This service handles business logic for Delivery Addresses using Sequelize ORM.
 * It assumes Sequelize models are properly defined and exported from a central '/models' directory.
 */

// Import the Sequelize instance and the DeliveryAddress model
// The path might need adjustment based on your project structure.
const { sequelize, DeliveryAddress } = require("../models");

/**
 * Creates a new delivery address for a user.
 * If it's the user's first address, it's automatically set as the default.
 * @param {number} userId The ID of the user creating the address.
 * @param {object} data The data for the new address (e.g., { fullName, phoneNumber, address }).
 * @returns {Promise<import('../../models/deliveryaddress')>} The newly created address instance.
 */
const createAddress = async (userId, data) => {
  // Check if this is the user's first address using Sequelize's count method
  const addressCount = await DeliveryAddress.count({ where: { userId } });

  // Create the new address record using Sequelize's create method
  const newAddress = await DeliveryAddress.create({
    ...data,
    userId, // Explicitly set the foreign key
    isDefault: addressCount === 0, // Set as default if it's the first one
  });

  return newAddress;
};

/**
 * Retrieves all delivery addresses for a specific user.
 * @param {number} userId The ID of the user.
 * @returns {Promise<import('../../models/deliveryaddress')[]>} An array of the user's address instances.
 */
const getAddressesForUser = async (userId) => {
  // Use findAll with 'order' option to sort results.
  // The syntax is an array of arrays: [['column', 'DIRECTION']]
  return DeliveryAddress.findAll({
    where: { userId },
    order: [['isDefault', 'DESC']], // Show the default address first
  });
};

/**
 * Updates a delivery address. Throws an error if not found.
 * @param {number} id The ID of the address to update.
 * @param {object} data The new data for the address.
 * @returns {Promise<import('../../models/deliveryaddress')>} The updated address instance.
 * @throws {Error} If the address is not found.
 */
const updateAddress = async (id, data) => {
  // Sequelize's update method returns an array: [numberOfAffectedRows, updatedRows[]]
  // We must use 'returning: true' to get the updated object back.
  const [affectedRows, updatedAddresses] = await DeliveryAddress.update(data, {
    where: { id },
    returning: true, // Crucial for returning the updated object
  });

  if (affectedRows === 0) {
    throw new Error("Address not found or no changes were made.");
  }

  // Return the first (and only) updated address object
  return updatedAddresses[0];
};

/**
 * Deletes a delivery address. Throws an error if not found.
 * @param {number} id The ID of the address to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the address is not found.
 */
const deleteAddress = async (id) => {
  // Sequelize's 'destroy' method returns the number of rows deleted.
  const deletedRows = await DeliveryAddress.destroy({ where: { id } });

  if (deletedRows === 0) {
    throw new Error("Address not found.");
  }

  return deletedRows;
};

/**
 * Sets a specific address as the default for a user. This is a transactional operation.
 * It first unsets any other default address the user might have.
 * @param {number} userId The ID of the user.
 * @param {number} addressId The ID of the address to set as default.
 * @returns {Promise<import('../../models/deliveryaddress')>} The new default address instance.
 * @throws {Error} If the address is not found or does not belong to the user.
 */
const setAddressAsDefault = async (userId, addressId) => {
  // Use a managed transaction to ensure both updates succeed or neither do.
  return sequelize.transaction(async (t) => {
    // Step 1: Unset any current default address for this user.
    // Every query inside the transaction must include the { transaction: t } option.
    await DeliveryAddress.update(
      { isDefault: false },
      {
        where: {
          userId: userId,
          isDefault: true,
        },
        transaction: t,
      }
    );

    // Step 2: Set the new address as the default.
    // Adding userId to the where clause is a good security practice.
    const [affectedRows, updatedAddresses] = await DeliveryAddress.update(
      { isDefault: true },
      {
        where: {
          id: addressId,
          userId: userId, // Ensures user can't set someone else's address as default
        },
        transaction: t,
        returning: true, // Get the updated record back
      }
    );

    if (affectedRows === 0) {
      // This will automatically roll back the transaction
      throw new Error("Address not found or it does not belong to the user.");
    }

    return updatedAddresses[0];
  });
};

module.exports = {
   createAddress,
   getAddressesForUser,
   updateAddress,
   deleteAddress,
   setAddressAsDefault,
};
