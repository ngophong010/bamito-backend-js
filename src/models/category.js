"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");
/**
 * @typedef {Object} CategoryAttributes
 * @property {number} id
 * @property {string} CategoryId
 * @property {string} CategoryName
 */

/**
 * @typedef {Partial<CategoryAttributes>} CategoryCreationAttributes
 */

class Category extends Model {
  static associate(models) {
    // A Category has many Products
    Category.hasMany(models.Product, {
      foreignKey: "categoryId",
      as: "products",
    });

    // A category has many Sizes
    Category.hasMany(models.Size, {
      foreignKey: "categoryId",
      as: "sizes",
    });
  }
}

Category.init(
  {
    categoryId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'category_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'name',
    },
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "categories",
    timestamps: true,
    // Map timestamp attributes to snake_case columns
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Category;
