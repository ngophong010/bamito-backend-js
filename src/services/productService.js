const { v2: cloudinary } = require('cloudinary');

const db = require("../models");
const { Op, Sequelize } = require('sequelize');

const {
  Product,
  Brand,
  Category,
  Feedback,
  Inventory,
  Size,
  OrderItem,
  Order,
} = db;

/**
 * Creates a new product. Throws an error if unique constraints are violated.
 * @param {object} data The data for the new product.
 * @returns {Promise<import('../../models/product')>} The newly created product instance.
 */
const createProduct = async (data) => {
  if (!data.productId || !data.brandId || !data.categoryId || !data.name || !data.price) {
    throw new Error("Missing required parameters!");
  }

  try {
    return await db.Product.create(data);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      throw new Error(`A product with this ${field} already exists.`);
    }
    throw error;
  }
};

/**
 * A shared helper function for getting paginated lists of products with their average ratings.
 * @private
 */
const getPaginatedProducts = async (where, limit = 10, page = 1, sort = "id,desc") => {
    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(',');

    const { count, rows } = await Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortField, sortOrder]],
        include: [
            { model: Brand, as: 'brand', attributes: ['brandId', 'name'] },
            { model: Category, as: 'category', attributes: ['categoryId', 'name'] },
            // Include Feedback only for the aggregate calculation
            { model: Feedback, as: 'feedbacks', attributes: [] },
        ],
        attributes: {
            // Include all Product attributes
            include: [
                // Add a calculated 'rating' attribute using a DB aggregate function
                [Sequelize.fn('ROUND', Sequelize.fn('AVG', Sequelize.col('feedbacks.rating')), 1), 'rating']
            ]
        },
        group: ['Product.id', 'brand.id', 'category.id'],
        subQuery: false, // Important for correct LIMIT/OFFSET with includes/groups
    });

    return {
        totalItems: Array.isArray(count) ? count.length : count,
        totalPages: Math.ceil((Array.isArray(count) ? count.length : count) / limit),
        currentPage: page,
        products: rows,
    };
};

const getAllProducts = (limit, page, sort, name) => {
    const where = {};
    if (name) {
        where.name = { [Op.iLike]: `%${name}%` };
    }
    return getPaginatedProducts(where, limit, page, sort);
};

const getAllProductsByCategory = (categoryId, limit, page, sort, filter = {}) => {
    const where = { categoryId };
    if (filter.brandId && filter.brandId.length > 0) {
        where.brandId = { [Op.in]: filter.brandId };
    }
    if (filter.price && filter.price.length === 2) {
        where.price = { [Op.between]: filter.price };
    }
    return getPaginatedProducts(where, limit, page, sort);
};

const getAllProductsOnSale = (limit, page) => {
    const where = { discount: { [Op.gt]: 0 } };
    return getPaginatedProducts(where, limit, page);
};

const getProductDetails = async (productId) => {
  if (!productId) {
    throw new Error("Missing required productId parameter!");
  }
  
  const product = await db.Product.findOne({
    where: { productId },
    include: [
      { model: Brand, as: 'brand', attributes: ['brandId', 'name'] },
      { model: Category, as: 'category', attributes: ['categoryId', 'name'] },
      {
        model: Inventory,
        as: 'inventory',
        attributes: ['quantity', 'sold'],
        include: [{ model: Size, as: 'size', attributes: ['sizeId', 'name'] }]
      }
    ],
    // Perform aggregate calculations in the same query for efficiency
    attributes: {
        include: [
            [sequelize.fn('ROUND', sequelize.fn('AVG', sequelize.col('feedbacks.rating')), 1), 'averageRating'],
            [sequelize.fn('COUNT', sequelize.col('feedbacks.id')), 'feedbackCount']
        ]
    },
    include: [
        // ... (brand, category, inventory includes)
        { model: Feedback, as: 'feedbacks', attributes: [] } // Include for aggregation
    ],
    group: ['Product.id', 'brand.id', 'category.id', 'inventory.id', 'inventory->size.id']
  });

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
};

const getUnreviewedProductsForUser = async (userId) => {
  if (!userId) {
    throw new Error("Missing required userId parameter!");
  }

  const unreviewedItems = await db.OrderItem.findAll({
    where: {
      statusFeedback: 0, // Not reviewed
    },
    include: [
      {
        model: Order,
        as: 'order',
        where: {
          userId: userId,
          status: 3, // Order was completed
        },
        attributes: [], // Don't need fields from the Order itself
      },
      { model: Size, as: 'size', attributes: ['sizeId', 'name'] },
      { model: Product, as: 'product', attributes: ['image', 'name', 'price', 'discount', 'productId'] }
    ]
  });
  
  // Format the data to a flat structure
  return unreviewedItems.map(item => ({
    ...item.product.toJSON(),
    orderId: item.orderId,
    quantity: item.quantity,
    totalPrice: item.totalPrice, // Assuming totalPrice is on OrderItem
    sizeId: item.size.sizeId,
    sizeName: item.size.name,
  }));
};

const updateProduct = async (id, data, newImageFile) => {
  const productToUpdate = await db.Product.findByPk(id);
  if (!productToUpdate) {
    throw new Error("Product not found.");
  }

  // If there's a new image and an old one exists, delete the old one from Cloudinary
  if (newImageFile && productToUpdate.imageId) {
    await cloudinary.uploader.destroy(productToUpdate.imageId);
  }

  const updateData = { ...data };
  if (newImageFile) {
      updateData.image = newImageFile.path;
      updateData.imageId = newImageFile.filename;
  }

  try {
    const [, [updatedProduct]] = await db.Product.update(updateData, {
        where: { id },
        returning: true
    });
    return updatedProduct;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      throw new Error(`Another product with this ${field} already exists.`);
    }
    throw error;
  }
};

const deleteProduct = async (id) => {
  const product = await db.Product.findByPk(id);
  if (!product) {
    throw new Error("Product not found.");
  }
  
  // If an image is associated with the product, delete it from Cloudinary first
  if (product.imageId) {
    await cloudinary.uploader.destroy(product.imageId);
  }

  // Then delete the product from the database
  return Product.destroy({ where: { id } });
};

module.exports = {
  createProduct,
  getAllProducts,
  getAllProductsByCategory,
  getAllProductsOnSale,
  getProductDetails,
  getUnreviewedProductsForUser,
  updateProduct,
  deleteProduct,
};