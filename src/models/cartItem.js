"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * CartItem model definition
 * @param {Sequelize} sequelize
 * @returns {typeof Model}
 */
class CartItem extends Model {
  static associate(models) {
    CartItem.belongsTo(models.Cart, { foreignKey: "cartId", as: "cart" });
    CartItem.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
    CartItem.belongsTo(models.Size, { foreignKey: "sizeId", as: "size" });
  }
}

CartItem.init(
  {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'total_price',
    },
    // ENHANCEMENT: Map foreign keys to snake_case columns
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cart_id',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
    },
    sizeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'size_id',
    },
  },
  {
    sequelize,
    modelName: "CartItem",
    tableName: "cart_items",
    timestamps: true, // adds createdAt and updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // ENHANCEMENT: Make the model aware of the composite index
    indexes: [{
      unique: true,
      fields: ['cart_id', 'product_id', 'size_id']
    }]
  }
);

module.exports = CartItem;
