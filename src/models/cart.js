'use strict';
const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/connectDB.js'); 

// 2. Define the model as a class that extends Model
class Cart extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index.js` file will call this method automatically.
   */
  static associate(models) {
    // A Cart belongs to one User
    Cart.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user", // 'user' is a more conventional alias than 'userData'
    });

    // A Cart can have many CartItems (or CartDetails)
    Cart.hasMany(models.CartItem, { // Assuming the model is named CartDetail
      foreignKey: "cartId",
      as: "cartItems", // Using camelCase is a strong convention
    });
  }
}

// 3. Initialize the model with attributes and options
Cart.init(
  {
    cartId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'cart_id',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // A user should only ever have one cart
        field: 'user_id',
        references: {  // It's a good practice to define foreign key references
            model: 'users', // The table name
            key: 'id'
        }
    },
  },
  {
    sequelize, // Pass the imported sequelize instance
    modelName: "Cart",
    tableName: "carts",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Cart;
