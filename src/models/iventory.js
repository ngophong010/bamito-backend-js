// src/models/inventory.js

"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

class Inventory extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index.js` file will call this method automatically.
   */
  static associate(models) {
    // An Inventory entry belongs to one Product
    Inventory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
    // An Inventory entry belongs to one Size
    Inventory.belongsTo(models.Size, {
      foreignKey: 'sizeId',
      as: 'size',
    });
  }
}

Inventory.init(
  {    
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    sold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // ENHANCEMENT: Map model attributes to snake_case DB columns
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: {
        model: "products",
        key: "id",
      },
    },
    sizeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'size_id',
      references: {
        model: "sizes",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "Inventory",
    tableName: "inventories",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // ENHANCEMENT: Make the model aware of the composite index
    indexes: [{
      unique: true,
      fields: ['product_id', 'size_id']
    }]
  }
);

module.exports = Inventory;