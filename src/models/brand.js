'use strict';
/**
 * Brand model definition
 * @param {Sequelize} sequelize 
 * @returns {typeof Model}
 */

const { Model, DataTypes } = require("sequelize");
const { sequelize } = require('../config/connectDB.js'); 

class Brand extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index.js` file will call this method automatically.
   */
  static associate(models) {
    // A Brand has many Products
    Brand.hasMany(models.Product, {
      foreignKey: 'brandId',
      as: 'products',
    });
  }
}

// 3. Initialize the model with attributes and options
Brand.init(
  {
    // You don't need to define 'id'. Sequelize adds it automatically.
    brandId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'brand_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // It's good practice for brand names to be unique too
      field: 'brand_name',
    },
  },
  {
    sequelize, // Pass the imported sequelize instance
    modelName: 'Brand',
    // 'tableName: 'brands'' is often inferred, but it's good to be explicit
    tableName: 'brands',
    // 'timestamps: true' is the default, so it's optional but good for clarity
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Brand;
