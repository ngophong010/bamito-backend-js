'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('vouchers', [
      {
        voucher_id: 'SALE100K', // Use a more readable business key
        image: 'https://res.cloudinary.com/daphxc3ye/image/upload/v1702644868/Badminton/tp4lcop7vpqkwopxgyo3.png',
        image_id: 'Badminton/tp4lcop7vpqkwopxgyo3',
        voucher_price: 100000,
        quantity: 100,
        // Convert Unix timestamps to JS Date objects. This is human-readable and correct.
        time_start: new Date(1703005200000), // Equivalent to 2023-12-19T17:00:00.000Z
        time_end: new Date(1703178000000),   // Equivalent to 2023-12-21T17:00:00.000Z
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        voucher_id: 'SPECIAL191K',
        image: 'https://res.cloudinary.com/daphxc3ye/image/upload/v1703394660/Badminton/osu31b9rdkdawp6kxird.png',
        image_id: 'Badminton/osu31b9rdkdawp6kxird',
        voucher_price: 191000,
        quantity: 67,
        time_start: new Date('2023-12-24T00:00:00Z'), // Using ISO 8601 strings is even more readable
        time_end: new Date('2023-12-30T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        voucher_id: 'BIGSALE200K',
        image: 'https://res.cloudinary.com/daphxc3ye/image/upload/v1702644830/Badminton/fcr03e0wtufukskjyynh.png',
        image_id: 'Badminton/fcr03e0wtufukskjyynh',
        voucher_price: 200000,
        quantity: 20,
        time_start: new Date('2023-12-15T00:00:00Z'),
        time_end: new Date('2024-01-30T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        voucher_id: 'MEGA500K',
        image: 'https://res.cloudinary.com/daphxc3ye/image/upload/v1702644797/Badminton/zaktehxdo8tjlrzslzuu.png',
        image_id: 'Badminton/zaktehxdo8tjlrzslzuu',
        voucher_price: 500000,
        quantity: 100,
        time_start: new Date('2023-12-15T00:00:00Z'),
        time_end: new Date('2023-12-16T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('vouchers', null, {});
  }
};
