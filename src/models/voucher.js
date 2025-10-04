"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * @typedef {Object} VoucherAttributes
 * @property {number} id
 * @property {string} voucherId
 * @property {string|null} image
 * @property {string|null} imageId
 * @property {number} voucherPrice
 * @property {number} quantity
 * @property {Date} timeStart
 * @property {Date} timeEnd
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Partial<VoucherAttributes>} VoucherCreationAttributes
 */

class Voucher extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index.js` file will call this method automatically.
   */
  static associate(models) {
    // A Voucher can be used in many Orders
    Voucher.hasMany(models.Order, {
      foreignKey: 'voucherId',
      as: 'orders'
    });
  }
}

Voucher.init(
  {
    voucherId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'voucher_id',
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'image_id',
    },
    voucherPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'voucher_price',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timeStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'time_start',
    },
    timeEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'time_end',
    },
  },
  {
    sequelize,
    modelName: "Voucher",
    tableName: "vouchers",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Voucher;
