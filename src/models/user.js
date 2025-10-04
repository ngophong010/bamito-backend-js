"use strict";
const bcrypt = require("bcryptjs");
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * @typedef {Object} UserAttributes
 * @property {number} id
 * @property {string} userName
 * @property {string} password
 * @property {string} email
 * @property {string|null} avatar
 * @property {string|null} avatarId
 * @property {string|null} phoneNumber
 * @property {Date|null} birthday
 * @property {string|null} otpCode
 * @property {Date|null} timeOtp
 * @property {number} roleId
 * @property {string|null} tokenRegister
 * @property {number} status
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Partial<UserAttributes>} UserCreationAttributes
 */

class User extends Model {
  /**
   * Validate user password
   * @param {string} password
   * @returns {boolean}
   */
  async validPassword(password) {
    // FIX: Use the async version of compare to avoid blocking the event loop.
    return await bcrypt.compare(password, this.password);
  }

  /**
   * Define model associations
   * @param {import("./index.js")} models
   */
  static associate(models) {
    User.belongsTo(models.Role, {
      foreignKey: "roleId",
      as: "role",
    });

    User.belongsToMany(models.Product, {
      through: models.Favourite,
      foreignKey: "userId",
      otherKey: "productId",
      as: "favouriteProducts",
    });

    User.hasMany(models.Order, {
      foreignKey: "userId",
      as: "orders",
    });

    // A User can have one Cart
    User.hasOne(models.Cart, {
      foreignKey: "userId",
      as: "cart",
    });

    // A user can have many Feedback entries
    User.hasMany(models.Feedback, {
      foreignKey: "userId",
      as: "feedbacks",
    });

    // A user can have many Delivery Addresses
    User.hasMany(models.DeliveryAddress, {
      foreignKey: "userId",
      as: "deliveryAddresses",
    });
  }
}

User.init(
  {
    userName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      field: 'user_name'
    },
    password: { 
      type: DataTypes.STRING, 
      allowNull: false,
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      validate: { isEmail: true },  
    },
    avatar: { 
      type: DataTypes.STRING, 
      field: 'avatar' 
    },
    avatarId: { 
      type: DataTypes.STRING, 
      field: 'avatar_id' 
    },
    phoneNumber: { 
      type: DataTypes.STRING, 
      unique: true, 
      field: 'phone_number' 
    },
    birthday: { 
      type: DataTypes.DATEONLY, 
      field: 'birthday' 
    },
    otpCode: { 
      type: DataTypes.STRING, 
      field: 'otp_code' 
    },
    timeOtp: { 
      type: DataTypes.DATE, 
      field: 'time_otp' },
    roleId: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      field: 'role_id' },
    tokenRegister: { 
      type: DataTypes.STRING, 
      field: 'token_register' 
    },
    status: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      // Auto-hash password before save
      beforeSave: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
    defaultScope: {
      // Exclude password by default
      attributes: { exclude: ["password", "tokenRegister", "otpCode", "timeOtp"] },
    },
    scopes: {
      withPassword: { attributes: { include: ["password"] } },
      withAuthDetails: { attributes: { include: ["password", "tokenRegister", "otpCode", "timeOtp"] } },
    },
  }
);

module.exports = User;
