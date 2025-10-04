'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Use bulkInsert to add multiple records at once
    await queryInterface.bulkInsert('roles', [
      {
        role_id: 'R1',
        role_name: 'ADMIN',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_id: 'R2',
        role_name: 'STAFF',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        role_id: 'R3',
        role_name: 'USER',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    // This allows you to reverse the seeding
    await queryInterface.bulkDelete('roles', null, {});
  }
};
