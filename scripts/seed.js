// scripts/seed.js

/**
 * @fileoverview This script populates the database with a large amount of realistic
 * fake data for development and testing. It should be run AFTER the foundational
 * seeders (`npx sequelize-cli db:seed:all`).
 *
 * To run: `node scripts/seed.js`
 */

const { faker } = require('@faker-js/faker');
const db = require('../src/models');
const { sequelize } = require('../src/config/connectDB');

// --- CONFIGURATION ---
const USER_COUNT = 50;
const PRODUCT_COUNT = 200;
const ORDER_COUNT = 150;

/**
 * A helper function to get a random item from an array.
 * @param {Array<T>} arr The array to pick from.
 * @returns {T} A random item from the array.
 */
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seedUsers = async () => {
  console.log(`Creating ${USER_COUNT} fake users...`);
  const userRole = await db.Role.findOne({ where: { role_id: 'R3' } }); // 'USER' role
  if (!userRole) throw new Error("Role 'R3' not found. Please run foundational seeders first.");

  const usersToCreate = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    usersToCreate.push({
      userName: `${firstName}_${lastName}${faker.number.int({ min: 10, max: 99 })}`,
      email: faker.internet.email({ firstName, lastName }),
      password: 'password123',
      phoneNumber: faker.phone.number(),
      roleId: userRole.id,
      status: 1,
    });
  }
  await db.User.bulkCreate(usersToCreate, { ignoreDuplicates: true });
  console.log('✅ Finished creating users.');
};


const seedProducts = async () => {
    console.log(`Creating ${PRODUCT_COUNT} fake products...`);
    const brands = await db.Brand.findAll(); // Use db.Brand
    const categories = await db.Category.findAll(); // Use db.Category
    if (!brands.length || !categories.length) throw new Error("Brands or Categories not found.");

    const productsToCreate = [];
    for (let i = 0; i < PRODUCT_COUNT; i++) {
        const randomBrand = getRandom(brands);
        const randomCategory = getRandom(categories);
        productsToCreate.push({
            productId: `FAKE-${faker.string.alphanumeric(10).toUpperCase()}`,
            name: `${randomBrand.brandName} ${faker.commerce.productName()}`,
            price: faker.commerce.price({ min: 200000, max: 5000000, dec: 0 }),
            discount: faker.number.int({ min: 0, max: 3 }) === 0 ? faker.number.int({ min: 5, max: 50 }) : 0,
            descriptionHTML: `<p>${faker.lorem.paragraphs(3)}</p>`,
            brandId: randomBrand.id,
            categoryId: randomCategory.id,
            image: faker.image.urlLoremFlickr({ category: 'sports' }),
            imageId: faker.string.uuid(),
        });
    }
    await db.Product.bulkCreate(productsToCreate); // Use db.Product
    console.log('✅ Finished creating products.');
};

const seedInventory = async () => {
    console.log('Creating fake inventory...');
    const products = await db.Product.findAll();
    const sizes = await db.Size.findAll();
    if (!products.length || !sizes.length) throw new Error("Products or Sizes not found.");

    const inventoryEntries = [];
    for (const product of products) {
        // Find sizes relevant to the product's category
        const relevantSizes = sizes.filter(s => s.categoryId === product.categoryId);
        const sizesToUse = relevantSizes.length > 0 ? relevantSizes : sizes; // Fallback to all sizes if none match

        // Give each product 2-5 random sizes with stock
        const numSizes = faker.number.int({ min: 2, max: 5 });
        const usedSizeIds = new Set();

        for (let i = 0; i < numSizes; i++) {
            const randomSize = getRandom(sizesToUse);
            if (!usedSizeIds.has(randomSize.id)) {
                inventoryEntries.push({
                    productId: product.id,
                    sizeId: randomSize.id,
                    quantity: faker.number.int({ min: 0, max: 200 }),
                });
                usedSizeIds.add(randomSize.id);
            }
        }
    }
    await db.Inventory.bulkCreate(inventoryEntries, { ignoreDuplicates: true });
    console.log('✅ Finished creating inventory.');
};


const seedAddresses = async () => {
    console.log('Creating fake delivery addresses...');
    const users = await db.User.findAll();
    if (!users.length) throw new Error("Users not found.");

    const addressesToCreate = [];
    for (const user of users) {
        for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
            addressesToCreate.push({
                userId: user.id,
                receiverName: user.userName,
                phone: user.phoneNumber || faker.phone.number(),
                // FIX 2: Use modern faker API (location instead of address)
                streetLine1: faker.location.streetAddress(),
                city: faker.location.city(),
                postalCode: faker.location.zipCode(),
                country: 'Vietnam',
                isDefault: i === 0,
            });
        }
    }
    await db.DeliveryAddress.bulkCreate(addressesToCreate);
    console.log('✅ Finished creating addresses.');
};


const seedFavouritesAndFeedback = async () => {
    console.log('Creating fake favourites and feedback...');
    const users = await db.User.findAll();
    const products = await db.Product.findAll();
    if (!users.length || !products.length) throw new Error("Users or Products not found.");

    const favouritesToCreate = [];
    const feedbacksToCreate = [];

    for (const user of users) {
        // Each user favourites 5-15 random products
        for (let i = 0; i < faker.number.int({ min: 5, max: 15 }); i++) {
            const randomProduct = getRandom(products);
            favouritesToCreate.push({ userId: user.id, productId: randomProduct.id });
        }
        // Each user reviews 3-7 random products
        for (let i = 0; i < faker.number.int({ min: 3, max: 7 }); i++) {
            const randomProduct = getRandom(products);
            feedbacksToCreate.push({
                userId: user.id,
                productId: randomProduct.id,
                rating: faker.number.int({ min: 3, max: 5 }),
                description: faker.lorem.paragraph(),
            });
        }
    }
    await db.Favourite.bulkCreate(favouritesToCreate, { ignoreDuplicates: true });
    await db.Feedback.bulkCreate(feedbacksToCreate, { ignoreDuplicates: true });
    console.log('✅ Finished creating favourites and feedback.');
};


const seedOrders = async () => {
    console.log(`Creating ${ORDER_COUNT} fake orders...`);
    const users = await db.User.findAll();
    // Eager-load the associations to get product and size data
    const inventory = await db.Inventory.findAll({ include: ['product', 'size'] });
    if (!users.length || !inventory.length) throw new Error("Users or Inventory not found.");

    for (let i = 0; i < ORDER_COUNT; i++) {
        const randomUser = getRandom(users);
        const numItems = faker.number.int({ min: 1, max: 4 });
        let totalPrice = 0;
        const orderItemsData = [];
        
        for (let j = 0; j < numItems; j++) {
            const randomInventoryItem = getRandom(inventory);
            // Destructure the associated models
            const { product, size } = randomInventoryItem;
            
            // Defensive check to make sure the associations loaded correctly
            if (product && size) {
              const quantity = faker.number.int({ min: 1, max: 3 });
              const itemPrice = product.price * (1 - (product.discount || 0) / 100);

              orderItemsData.push({
                  productId: product.id,
                  sizeId: size.id,
                  quantity: quantity,
                  price: itemPrice,
                  // --- SNAPSHOT FIELDS ---
                  productName: product.name,
                  productImage: product.image,
                  sizeName: size.name, // <-- THE FIX IS HERE
                  statusFeedback: faker.datatype.boolean() ? 1 : 0,
              });
              totalPrice += itemPrice * quantity;
            }
        }
        
        if (orderItemsData.length > 0) {
          await db.Order.create({
              orderId: `FAKE-${faker.string.alphanumeric(8).toUpperCase()}`,
              userId: randomUser.id,
              totalPrice: totalPrice,
              payment: getRandom(['COD', 'PAYPAL']),
              deliveryAddress: faker.location.streetAddress(true),
              status: getRandom([0, 1, 2, 3]),
          }).then(order => {
              return db.OrderItem.bulkCreate(orderItemsData.map(item => ({ ...item, orderId: order.id })));
          });
        }
    }
    console.log('✅ Finished creating orders.');
};

/**
 * The main function to run all seeding operations in the correct order.
 */
const run = async () => {
  try {
    console.log('--- STARTING FAKE DATA SEEDING ---');

    // Run seeders in order of dependency
    await seedUsers();
    await seedProducts();
    await seedInventory();
    await seedAddresses();
    await seedFavouritesAndFeedback();
    await seedOrders();

    console.log('--- FAKE DATA SEEDING COMPLETE ---');
  } catch (error) {
    console.error("❌ An error occurred during the seeding process:", error);
  } finally {
    await sequelize.close();
    console.log("Database connection closed.");
  }
};

run();
