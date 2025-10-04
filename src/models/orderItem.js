"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");
/**
 * @typedef {Object} OrderItemAttributes
 * @property {number} id
 * @property {number} orderId
 * @property {number} productId
 * @property {number} sizeId
 * @property {number} quantity
 * @property {number} totalPrice
 * @property {number} statusFeedback
 */

/**
 * @param {Sequelize} sequelize
 * @returns {typeof Model}
 */
class OrderItem extends Model {
  static associate(models) {
    OrderItem.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });
    OrderItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });
    OrderItem.belongsTo(models.Size, { foreignKey: "sizeId", as: "size" });
  }
}

OrderItem.init(
  {
    orderId: { type: DataTypes.INTEGER, allowNull: false, field: "order_id" },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    sizeId: { type: DataTypes.INTEGER, allowNull: false, field: "size_id" },

    // --- Purchase Details ---
    quantity: { type: DataTypes.INTEGER, allowNull: false },

    // --- SNAPSHOT FIELDS ---
    price: { type: DataTypes.FLOAT, allowNull: false },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "product_name",
    },
    productImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "product_image",
    },
    sizeName: { type: DataTypes.STRING, allowNull: false, field: "size_name" },

    // --- Status Tracking ---
    statusFeedback: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "status_feedback",
    },
  },
  {
    sequelize,
    modelName: "OrderItem",
    tableName: "order_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = OrderItem;
