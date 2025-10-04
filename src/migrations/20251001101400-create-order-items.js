// migrations/...-create-order-items.js

"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("order_items", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      // --- Foreign Keys ---
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE", // If an order is deleted, its items are deleted.
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "products", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Keep item history even if product is deleted
      },
      size_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "sizes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Keep item history even if size is deleted
      },
      
      // --- Purchase Details ---
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      // --- SNAPSHOT FIELDS ---
      // These store the data as it was at the moment of purchase.
      price: {
        type: Sequelize.FLOAT, // Price of a single item at time of purchase
        allowNull: false,
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      product_image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      size_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      
      // --- Status Tracking ---
      status_feedback: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // 0 = Not Reviewed, 1 = Reviewed
      },
      
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("order_items");
  },
};
