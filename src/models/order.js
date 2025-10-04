// src/models/order.js

"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

class Order extends Model {
  static associate(models) {
    // An Order belongs to one User
    Order.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    // An Order can optionally belong to one Voucher
    Order.belongsTo(models.Voucher, { foreignKey: "voucherId", as: "voucher" });
    // An Order has many OrderItems
    Order.hasMany(models.OrderItem, { foreignKey: "orderId", as: "items" });
  }
}

Order.init(
  {
    orderId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true, 
      field: 'order_id' 
    },
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      field: 'user_id' 
    },
    voucherId: { 
      type: DataTypes.INTEGER, 
      field: 'voucher_id' 
    },
    totalPrice: { 
      type: DataTypes.FLOAT, 
      allowNull: false, 
      field: 'total_price' 
    },
    payment: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    deliveryAddress: { 
      type: DataTypes.TEXT, 
      allowNull: false, 
      field: 'delivery_address' 
    },
    status: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 1 
    },
  },
  {
    sequelize,
    modelName: "Order",
    tableName: "orders",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Order;
