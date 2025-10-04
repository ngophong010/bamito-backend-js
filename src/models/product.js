"use strict";
const { Model, DataTypes } = require("sequelize");
const { sequelize } = require("../config/connectDB.js");

/**
 * @typedef {Object} ProductAttributes
 * @property {number} id
 * @property {string} productId
 * @property {string} name
 * @property {string|null} image
 * @property {string|null} imageId
 * @property {number} price
 * @property {number} discount
 * @property {number} rating
 * @property {string|null} descriptionContent
 * @property {string|null} descriptionHTML
 * @property {number} brandId
 * @property {number} categoryId
 */

/**
 * @param {Sequelize} sequelize
 * @returns {typeof Model}
 */

class Product extends Model {
  static associate(models) {
    Product.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "category",
    });
    Product.belongsTo(models.Brand, {
      foreignKey: "brandId",
      as: "brand",
    });
    Product.belongsToMany(models.Size, {
      through: models.Inventory,
      foreignKey: "productId",
      otherKey: "sizeId",
      as: "sizes",
    });
    Product.belongsToMany(models.User, {
      through: models.Favourite,
      foreignKey: "productId",
      otherKey: "userId",
      as: "favouritedBy",
    });
    Product.hasMany(models.Feedback, {
      foreignKey: "productId",
      as: "feedbacks",
    });
    Product.hasMany(models.OrderItem, {
      foreignKey: "productId",
      as: "orderItems",
    });
    // A Product can have many Inventory entries
    Product.hasMany(models.Inventory, {
      foreignKey: "productId",
      as: "inventory",
    });
  }
}

Product.init(
  {
    productId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true, 
      field: 'product_id' 
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    image: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    imageId: { 
      type: DataTypes.STRING, 
      allowNull: true, 
      field: 'image_id' 
    },
    price: { 
      type: DataTypes.FLOAT, 
      allowNull: false 
    },
    discount: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    descriptionContent: { 
      type: DataTypes.TEXT, 
      allowNull: true, 
      field: 'description_content' 
    },
    descriptionHTML: { 
      type: DataTypes.TEXT, 
      allowNull: true, 
      field: 'description_html' 
    },
    brandId: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      field: 'brand_id' 
    },
    categoryId: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      field: 'category_id' 
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = Product;
