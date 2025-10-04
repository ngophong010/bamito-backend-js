"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

class DeliveryAddress extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index.js` file will call this method automatically.
   */
  static associate(models) {
    // Define the association here
    // A DeliveryAddress belongs to one User
    DeliveryAddress.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

DeliveryAddress.init(
  {
    receiverName: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      field: 'receiver_name' 
    },
    phone: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    streetLine1: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      field: 'street_line_1'
    },
    streetLine2: { 
      type: DataTypes.STRING, 
      allowNull: true, 
      field: 'street_line_2' 
    },
    city: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    postalCode: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      field: 'postal_code' 
    },
    country: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize, // Pass the imported sequelize instance
    modelName: 'DeliveryAddress',
    tableName: 'delivery_addresses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = DeliveryAddress;
