'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // The keys in these objects MUST match the snake_case column names in your migration file.
    await queryInterface.bulkInsert('brands', [
      { brand_id: 'ADI', brand_name: 'Adidas', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'FEL', brand_name: 'Felet', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'KAM', brand_name: 'Kamito', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'KAW', brand_name: 'Kawasaki', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'KUM', brand_name: 'Kumpoo', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'LN', brand_name: 'Lining', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'MIZ', brand_name: 'Mizuno', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'VNB', brand_name: 'VNB', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'VIC', brand_name: 'Victor', created_at: new Date(), updated_at: new Date() },
      { brand_id: 'YN', brand_name: 'Yonex', created_at: new Date(), updated_at: new Date() }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     */
    await queryInterface.bulkDelete('brands', null, {});
  }
};
