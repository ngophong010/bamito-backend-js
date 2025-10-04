/**
 * @fileoverview This service handles business logic for Roles using the Sequelize ORM.
 * It provides CRUD functionalities for managing user roles.
 */

const { Role } = require("../models");

/**
 * [ADMIN] Retrieves a list of all user roles.
 * @returns {Promise<import('../../models/role')[]>} An array of role instances.
 */
const getAllRoles = async () => {
    return Role.findAll({
        // Equivalent to Prisma's 'select'
        attributes: ['id', 'roleId', 'roleName'],
        // Equivalent to Prisma's 'orderBy'
        order: [['roleName', 'ASC']]
    });
};

/**
 * [ADMIN] Creates a new role.
 * @param {object} data The data for the new role (e.g., { roleId, roleName }).
 * @returns {Promise<import('../../models/role')>} The newly created role instance.
 * @throws {Error} If a role with the same roleId or roleName already exists.
 */
const createRole = async (data) => {
    try {
        // The unique constraint on the model will cause an error if a duplicate is inserted.
        const newRole = await Role.create(data);
        return newRole;
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path;
            throw new Error(`A role with this ${field} already exists.`);
        }
        throw error;
    }
};

/**
 * [ADMIN] Updates an existing role.
 * @param {number} id The primary key ID of the role to update.
 * @param {object} data The new data for the role.
 * @returns {Promise<import('../../models/role')>} The updated role instance.
 * @throws {Error} If the role is not found or the update violates a unique constraint.
 */
const updateRole = async (id, data) => {
    try {
        const [affectedRows, updatedRoles] = await Role.update(data, {
            where: { id },
            returning: true, // Crucial to get the updated object back
        });

        if (affectedRows === 0) {
            throw new Error("Role not found.");
        }

        return updatedRoles[0];
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path;
            throw new Error(`A role with this ${field} already exists.`);
        }
        throw error;
    }
};

/**
 * [ADMIN] Deletes a role by its primary key ID.
 * @param {number} id The ID of the role to delete.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 * @throws {Error} If the role is not found.
 */
const deleteRole = async (id) => {
    const deletedRows = await Role.destroy({
        where: { id },
    });

    if (deletedRows === 0) {
        throw new Error("Role not found.");
    }

    return deletedRows;
};

module.exports = {
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
};
