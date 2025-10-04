'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // --- STEP 1: Find the actual integer IDs of the parent categories ---
    // We query by the unique, predictable business key (category_id).
    const categories = await queryInterface.sequelize.query(
      `SELECT id, category_id FROM categories WHERE category_id IN ('RACKETS', 'SHOES', 'APPAREL_SHIRTS');`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Create a mapping for easy lookup, e.g., { RACKETS: 1, SHOES: 2, ... }
    const categoryIdMap = categories.reduce((map, category) => {
      map[category.category_id] = category.id;
      return map;
    }, {});

    if (!categoryIdMap.RACKETS || !categoryIdMap.SHOES || !categoryIdMap.APPAREL_SHIRTS) {
      throw new Error('Required categories not found. Please run the category seeder first.');
    }

    // --- STEP 2: Use the fetched IDs to insert the size data ---
    await queryInterface.bulkInsert('sizes', [
      // Racket Sizes (using the dynamically fetched category ID)
      { size_id: 'RKT_3U', name: '3U', category_id: categoryIdMap.RACKETS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'RKT_4U', name: '4U', category_id: categoryIdMap.RACKETS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'RKT_5U', name: '5U', category_id: categoryIdMap.RACKETS, created_at: new Date(), updated_at: new Date() },

      // Shoe Sizes
      { size_id: 'SHOE_39', name: '39', category_id: categoryIdMap.SHOES, created_at: new Date(), updated_at: new Date() },
      { size_id: 'SHOE_40', name: '40', category_id: categoryIdMap.SHOES, created_at: new Date(), updated_at: new Date() },
      { size_id: 'SHOE_41', name: '41', category_id: categoryIdMap.SHOES, created_at: new Date(), updated_at: new Date() },
      { size_id: 'SHOE_42', name: '42', category_id: categoryIdMap.SHOES, created_at: new Date(), updated_at: new Date() },
      { size_id: 'SHOE_43', name: '43', category_id: categoryIdMap.SHOES, created_at: new Date(), updated_at: new Date() },

      // Apparel Sizes
      { size_id: 'APP_S', name: 'S', category_id: categoryIdMap.APPAREL_SHIRTS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'APP_M', name: 'M', category_id: categoryIdMap.APPAREL_SHIRTS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'APP_L', name: 'L', category_id: categoryIdMap.APPAREL_SHIRTS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'APP_XL', name: 'XL', category_id: categoryIdMap.APPAREL_SHIRTS, created_at: new Date(), updated_at: new Date() },
      { size_id: 'APP_XXL', name: 'XXL', category_id: categoryIdMap.APPAREL_SHIRTS, created_at: new Date(), updated_at: new Date() },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('sizes', null, {});
  }
};
