'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // The keys MUST match the snake_case column names from your migration file.
    await queryInterface.bulkInsert('categories', [
      // Main Gear
      {
        category_id: 'RACKETS', // Use plural for consistency
        name: 'Vợt Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'SHOES',
        name: 'Giày Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'SHUTTLECOCKS',
        name: 'Quả Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Apparel
      {
        category_id: 'APPAREL_SHIRTS',
        name: 'Áo Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'APPAREL_SHORTS',
        name: 'Quần Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'APPAREL_SKIRTS',
        name: 'Váy Cầu Lông',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Accessories
      {
        category_id: 'ACCESSORIES_GRIPS',
        name: 'Cuốn Cán Vợt',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'ACCESSORIES_STRINGS',
        name: 'Dây Cước Căng Vợt',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        category_id: 'ACCESSORIES_BAGS',
        name: 'Bao Vợt & Balo',
        created_at: new Date(),
        updated_at: new Date()
      },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    /**
     * This will remove all entries from the categories table,
     * resetting it to an empty state.
     */
    await queryInterface.bulkDelete('categories', null, {});
  }
};
