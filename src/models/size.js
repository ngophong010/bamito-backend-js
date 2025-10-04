"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * @typedef {Object} SizeAttributes
 * @property {number} id
 * @property {string} sizeId  - Business key (e.g., "S", "M", "40")
 * @property {string} sizeName
 * @property {number} categoryId
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Partial<SizeAttributes>} SizeCreationAttributes
 */

class Size extends Model {
  static associate(models) {
    // A Size belongs to a Category
    Size.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
    });

    // A Size can be available for many Products (through the Inventory table)
    Size.belongsToMany(models.Product, {
      through: models.Inventory,
      foreignKey: "sizeId",
      otherKey: "productId",
      as: "products",
    });

    // A Size can appear in many CartItems
    Size.hasMany(models.CartItem, {
      foreignKey: "sizeId",
      sourceKey: "id",
      as: "CartItems",
    });
    Size.hasMany(models.OrderItem, {
      foreignKey: 'sizeId',
      as: 'orderItems',
    });
  }
}

Size.init(
  {
    sizeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "size_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: "categories",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Size",
    tableName: "sizes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    // ENHANCEMENT: Make the model aware of the composite index for better error messages
    indexes: [
      {
        unique: true,
        fields: ["category_id", "name"],
      },
    ],
  }
);

module.exports = Size;
