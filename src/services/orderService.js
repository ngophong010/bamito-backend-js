const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

const {
  sequelize,
  Order,
  OrderItem,
  Product,
  Size,
  Inventory,
  Cart,
  CartItem,
  User,
  Voucher,
} = require("../models");

const emailService = require("../utils/email.js");

/**
 * Creates an order from a user's cart items. This is a large, multi-step transactional operation.
 * @param {object} data The data for creating the order.
 * @returns {Promise<import('../../models/order')>} The newly created order instance.
 */
const createOrder = async (data) => {
  const { userId, payment, deliveryAddress, voucherId, cartItems } = data;
  if (
    !userId ||
    !payment ||
    !deliveryAddress ||
    !cartItems ||
    cartItems.length === 0
  ) {
    throw new Error("Missing required parameters!");
  }

  return sequelize.transaction(async (t) => {
    try {
      // Step 1: Fetch all product and size data for price calculation and snapshots
      const productIds = cartItems.map((item) => item.productId);
      const sizeIds = cartItems.map((item) => item.sizeId);

      const [products, sizes, user] = await Promise.all([
        Product.findAll({
          where: { id: { [Op.in]: productIds } },
          transaction: t,
        }),
        Size.findAll({ where: { id: { [Op.in]: sizeIds } }, transaction: t }),
        User.findByPk(userId, { transaction: t }), // 3. Retrive user information
      ]);

      if (!user) {
        throw new Error("User not found.");
      }

      // Step 2: Calculate total price and create snapshot data on the backend
      let totalPrice = 0;
      const orderItemsData = cartItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const size = sizes.find((s) => s.id === item.sizeId);
        if (!product || !size)
          throw new Error(
            `Product or Size not found for item: ${item.productId}/${item.sizeId}`
          );

        const itemPrice = product.price * (1 - (product.discount || 0) / 100);
        const itemTotalPrice = itemPrice * item.quantity;
        totalPrice += itemTotalPrice;

        return {
          productId: item.productId,
          sizeId: item.sizeId,
          quantity: item.quantity,
          price: itemPrice, // Snapshot of the price per item
          productName: product.name,
          productImage: product.image || "",
          sizeName: size.name,
        };
      });

      // Step 3: Create the Order header
      const order = await Order.create(
        {
          orderId: uuidv4().slice(-10).toUpperCase(),
          userId,
          voucherId,
          totalPrice,
          payment,
          deliveryAddress,
          status: 1, // 1 = Pending/Confirmed
        },
        { transaction: t }
      );

      // Step 4: Create the OrderItem records using bulkCreate for efficiency
      await OrderItem.bulkCreate(
        orderItemsData.map((item) => ({ ...item, orderId: order.id })),
        { transaction: t }
      );

      // Step 5: Decrement inventory for each item using atomic updates
      for (const item of cartItems) {
        await Inventory.update(
          {
            quantity: sequelize.literal(`quantity - ${item.quantity}`),
            sold: sequelize.literal(`sold + ${item.quantity}`),
          },
          {
            where: { productId: item.productId, sizeId: item.sizeId },
            transaction: t,
          }
        );
      }

      // Step 6: Clear the user's cart
      const userCart = await Cart.findOne({
        where: { userId },
        transaction: t,
      });
      if (userCart) {
        await CartItem.destroy({
          where: { cartId: userCart.id },
          transaction: t,
        });
      }

      // Step 7: Send order confirmation email (outside transaction)
      const orderDetailsForEmail = {
        ...order.toJSON(),
        user: user.toJSON(), // Thêm thông tin người dùng vào
      };

      await emailService.sendOrderConfirmation({
        email: user.email, // Lấy email từ đối tượng user
        orderDetails: orderDetailsForEmail,
      });

      return order;
    } catch (error) {
      // Nếu có bất kỳ lỗi nào xảy ra (kể cả việc gửi email),
      // transaction sẽ tự động được rollback.
      console.error("Failed to create order:", error);
      // Ném lỗi ra ngoài để controller có thể xử lý
      throw new Error("Could not create the order. Please try again.");
    }
  });
};

/**
 * Cancels a pending order and restores inventory. Transactional.
 * @param {number} orderId The ID of the order to cancel.
 * @returns {Promise<void>}
 */
const cancelOrder = async (orderId) => {
  return sequelize.transaction(async (t) => {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: "items" }], // Fetch items to restore inventory
      transaction: t,
    });

    if (!order) throw new Error("Order not found.");
    if (order.status !== 1)
      throw new Error("Only pending orders can be cancelled.");

    // Step 1: Update the order's status
    await order.update({ status: 0 }, { transaction: t }); // 0 = Cancelled

    // Step 2: Restore inventory for each item
    for (const item of order.items) {
      await Inventory.update(
        {
          quantity: sequelize.literal(`quantity + ${item.quantity}`),
          sold: sequelize.literal(`sold - ${item.quantity}`),
        },
        {
          where: { productId: item.productId, sizeId: item.sizeId },
          transaction: t,
        }
      );
    }
  });
};

const updateOrderStatus = async (orderId, status) => {
  const [affectedRows] = await Order.update(
    { status },
    { where: { id: orderId } }
  );
  if (affectedRows === 0) throw new Error("Order not found.");
  return { id: orderId, status };
};

const deleteOrder = (orderId) => updateOrderStatus(orderId, -1); // Soft delete

const getOrderDetail = async (orderId) => {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: "user", attributes: ["userName", "phoneNumber"] },
      {
        model: Voucher,
        as: "voucher",
        attributes: ["voucherId", "voucherPrice"],
      },
      {
        model: OrderItem,
        as: "items",
        include: [
          { model: Size, as: "size", attributes: ["sizeId", "name"] },
          {
            model: Product,
            as: "product",
            attributes: ["productId", "image", "name", "price", "discount"],
          },
        ],
      },
    ],
  });

  if (!order) throw new Error("Order not found.");
  return order;
};

const getAllOrders = async (status, limit = 10, page = 1, userId) => {
  const offset = (page - 1) * limit;
  const where = {};
  if (status !== undefined && status !== null) {
    where.status = status;
  }
  if (userId) {
    where.userId = userId;
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "DESC"]],
    attributes: [
      "id",
      "orderId",
      "totalPrice",
      "payment",
      "status",
      "createdAt",
    ],
    include: [{ model: User, as: "user", attributes: ["userName"] }],
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    orders: rows,
  };
};

const getAllOrdersForUser = (userId, status, limit, page) =>
  getAllOrders(status, limit, page, userId);
const getAllOrdersForAdmin = (status, limit, page) =>
  getAllOrders(status, limit, page);

const getStatistics = async () => {
  const incomeResult = await Order.sum("totalPrice", { where: { status: 3 } }); // 3 = Completed
  const totalOrder = await Order.count();
  const totalProduct = await Product.count();
  const statusCountsResult = await Order.findAll({
    group: ["status"],
    attributes: ["status", [sequelize.fn("COUNT", "status"), "count"]],
  });

  const statusCounts = statusCountsResult.reduce((acc, item) => {
    acc[item.getDataValue("status")] = item.getDataValue("count");
    return acc;
  }, {});

  return {
    totalIncome: incomeResult || 0,
    totalOrder,
    totalProduct,
    allTotalOrder: [
      { label: "Xác nhận", quantity: statusCounts[1] || 0 },
      { label: "Đang giao", quantity: statusCounts[2] || 0 },
      { label: "Hoàn tất", quantity: statusCounts[3] || 0 },
      { label: "Đã hủy", quantity: statusCounts[0] || 0 },
    ],
  };
};

const getSalesReport = async (timeStart, timeEnd, limit = 10, page = 1) => {
  const offset = (page - 1) * limit;

  const where = {
    createdAt: { [Op.between]: [timeStart, timeEnd] },
  };

  const { count, rows } = await OrderItem.findAndCountAll({
    where,
    limit,
    offset,
    attributes: [
      "productName",
      "productImage",
      "sizeName",
      "quantity",
      "price",
    ],
    include: [
      {
        model: Order,
        as: "order",
        where: { status: 3 }, // Completed orders only
        attributes: ["orderId", "createdAt"],
      },
    ],
  });

  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    reportItems: rows,
  };
};

module.exports = {
  createOrder,
  cancelOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderDetail,
  getAllOrdersForUser,
  getAllOrdersForAdmin,
  getStatistics,
  getSalesReport,
};
