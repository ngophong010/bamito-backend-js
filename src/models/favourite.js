"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

class Favourite extends Model {
  static associate(models) {
    // A Favourite belongs to a User
    Favourite.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    // A Favourite belongs to a Product
    Favourite.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
  }
}

Favourite.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
    },
  },
  {
    sequelize,
    modelName: "Favourite",
    tableName: "favourites",
    timestamps: true, // createdAt + updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // ENHANCEMENT: Make the model aware of the composite index for better error messages
    indexes: [{
      unique: true,
      fields: ['user_id', 'product_id']
    }]
  }
);

module.exports = Favourite;
