"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * @typedef {Object} RoleAttributes
 * @property {number} id
 * @property {string} roleId
 * @property {string} roleName
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Partial<RoleAttributes>} RoleCreationAttributes
 */

class Role extends Model {
  static associate(models) {
    // A Role can be assigned to many Users
    Role.hasMany(models.User, {
      foreignKey: "roleId",   // FK inside User table
      sourceKey: "roleId",        // Link to PK of Role table
      as: "users",
    });
  }
}

  Role.init(
    {
      roleId: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true,
        field: 'role_id',
      },
      roleName: { 
        type: DataTypes.STRING, 
        allowNull: false,
        field: 'role_name',
      },
    },
    {
      sequelize,
      modelName: "Role",
      tableName: "roles",
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

module.exports = Role;