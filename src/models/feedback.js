"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

class Feedback extends Model {
  static associate(models) {
    // A Feedback belongs to a User
    Feedback.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    // A Feedback belongs to a Product
    Feedback.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });
  }
}

Feedback.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // ENHANCEMENT: Add validation at the model level
      validate: {
        min: 1,
        max: 5,
      },
    },
  },
  {
    sequelize,
    modelName: "Feedback",
    tableName: "feedbacks",
    timestamps: true, // createdAt + updatedAt
    createdAt: "created_at",
    updatedAt: "updated_at",
    // ENHANCEMENT: Make the model aware of the composite index
    indexes: [
      {
        unique: true,
        fields: ["user_id", "product_id"],
      },
    ],
  }
);

module.exports = Feedback;
