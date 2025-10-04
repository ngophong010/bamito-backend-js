const { v4: uuidv4 } = require("uuid");
const {
  sequelize,
  Cart,
  CartItem,
  Product,
  Category,
  Inventory,
  Size,
} = require("../models");

/**
 * Adds an item to a user's cart. If the item (product/size combo) already exists,
 * it updates the quantity. If the user has no cart, one is created automatically.
 * This is a transactional operation.
 * @param {object} data The data for the cart item.
 * @param {number} data.userId The user's ID.
 * @param {number} data.productId The product's ID.
 * @param {number} data.sizeId The size's ID.
 * @param {number} data.quantity The desired quantity.
 * @returns {Promise<import('../../models/cartdetail')>} The created or updated cart detail instance.
 */
const addOrUpdateCartItem = async (data) => {
  const { userId, productId, sizeId, quantity } = data;
  if (userId == null || productId == null || sizeId == null || quantity == null) {
    throw new Error("Missing required parameters!");
  }

  // Use a managed transaction to ensure atomicity
  return sequelize.transaction(async (t) => {
    // Step 1: Find or create the user's cart header.
    // findOrCreate returns an array: [instance, created(boolean)]
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId, cartId: uuidv4().slice(-10) },
      transaction: t,
    });

    // Step 2: Get product price to calculate total price
    const product = await Product.findByPk(productId, { transaction: t });
    if (!product) {
      throw new Error("Product not found.");
    }
    const itemTotalPrice = (product.price - (product.price * (product.discount || 0) / 100)) * quantity;

    // Step 3: Find if the specific item (product/size) already exists in the cart.
    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId,
        sizeId,
      },
      transaction: t,
    });

    if (existingItem) {
      // If it exists, update the quantity and price
      existingItem.quantity = quantity;
      existingItem.totalPrice = itemTotalPrice;
      await existingItem.save({ transaction: t });
      return existingItem;
    } else {
      // If it's new, create it
      const newItem = await CartItem.create({
        cartId: cart.id,
        productId,
        sizeId,
        quantity,
        totalPrice: itemTotalPrice,
      }, { transaction: t });
      return newItem;
    }
  });
};

/**
 * Retrieves all items in a user's cart with full product and stock details.
 * @param {number} userId The ID of the user.
 * @returns {Promise<{products: object[], totalProduct: number}>} An object with formatted products and total count.
 */
const getCartContents = async (userId) => {
  if (!userId) {
    throw new Error("Missing required user ID!");
  }

  // Sequelize's 'include' fetches all related data in one query.
  // We fetch all inventory for each product and map it in JS.
  const cartItems = await CartItem.findAll({
    where: { '$Cart.userId$': userId }, // Query through the association
    order: [['createdAt', 'DESC']],
    include: [
      { model: Cart, attributes: [] }, // Include Cart for the WHERE clause, but don't select its fields
      {
        model: Product,
        as: 'product',
        include: [
          { model: Category, as: 'category', attributes: ['name'] },
          // Get all inventory entries for this product
          { model: Inventory, as: 'inventory', attributes: ['quantity', 'sizeId'] },
        ],
      },
      { model: Size, as: 'size', attributes: ['sizeId', 'name'] },
    ],
  });

  if (!cartItems || cartItems.length === 0) {
    return { products: [], totalProduct: 0 };
  }

  // Format the data into the clean structure the client expects
  const formattedProducts = cartItems.map(detail => {
    // Find the specific inventory entry for the item's size from the included list
    const stock = detail.product.inventory.find(inv => inv.sizeId === detail.sizeId);

    return {
      productId: detail.product.productId,
      categoryName: detail.product.category.name,
      name: detail.product.name,
      image: detail.product.image,
      sizeId: detail.size.sizeId,
      sizeName: detail.size.name,
      price: detail.product.price,
      discount: detail.product.discount,
      quantity: detail.quantity, // User's desired quantity
      totalPrice: detail.totalPrice,
      stockQuantity: stock ? stock.quantity : 0, // Available stock for that size
    };
  });

  return {
    products: formattedProducts,
    totalProduct: formattedProducts.length,
  };
};

/**
 * Removes a specific item (product/size combo) from a user's cart.
 * @param {number} userId The ID of the user.
 * @param {number} productId The ID of the product to remove.
 * @param {number} sizeId The ID of the size to remove.
 * @returns {Promise<number>} The number of deleted rows (should be 1).
 */
const removeCartItem = async (userId, productId, sizeId) => {
  if (userId == null || productId == null || sizeId == null) {
    throw new Error("Missing required parameters!");
  }

  // To delete a CartItem, we must first find its parent Cart to get the cartId.
  const cart = await Cart.findOne({ where: { userId } });
  if (!cart) {
    // If the user has no cart, the item can't exist, so the operation is successful.
    console.warn(`Attempted to remove item for user ${userId} who has no cart.`);
    return 0; // No rows deleted
  }

  // Use Sequelize's 'destroy' method, which returns the number of rows deleted.
  const deletedRows = await CartItem.destroy({
    where: {
      cartId: cart.id,
      productId,
      sizeId,
    },
  });

  if (deletedRows === 0) {
      // This is not necessarily an error, just means the item wasn't in the cart.
      // For a strict API, you could throw an error here.
      console.warn(`Item (product: ${productId}, size: ${sizeId}) not found in cart for user ${userId}.`);
  }

  return deletedRows;
};

// Export all service functions using CommonJS
module.exports = {
  addOrUpdateCartItem,
  getCartContents,
  removeCartItem,
};
