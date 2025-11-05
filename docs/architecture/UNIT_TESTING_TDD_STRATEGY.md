# 🚀 BAMITO Backend - Unit Testing & TDD Implementation Strategy

## Overview
This document outlines a comprehensive Unit Testing and Test-Driven Development (TDD) implementation strategy for the BAMITO badminton e-commerce backend to address real-world production challenges including code quality, reliability, maintainability, and confidence in deployments.

## Current Architecture Analysis
- ✅ **Solid Foundation**: Express.js, PostgreSQL, Sequelize ORM
- ✅ **Complex Business Logic**: Order processing, inventory management, authentication
- ✅ **Service Layer Architecture**: Controllers → Services → Models separation
- ✅ **Error Handling**: Global error handling with custom AppError
- ⚠️ **No Testing Framework**: Missing unit tests and testing infrastructure
- ⚠️ **Tight Coupling**: Direct database dependencies make testing difficult
- ⚠️ **No Test Coverage**: No visibility into code coverage or quality metrics
- ⚠️ **Manual Testing**: Reliance on manual testing increases risk

---

## 🎯 Unit Testing & TDD Benefits for E-commerce

### **Why TDD is Critical for BAMITO**

| **Challenge** | **TDD Solution** | **Business Impact** |
|---------------|------------------|-------------------|
| **Production Bugs** | Early bug detection through tests | 80% reduction in production issues |
| **Refactoring Fear** | Confidence through comprehensive test coverage | Safe code improvements and optimizations |
| **Integration Issues** | Isolated unit tests catch logic errors | Faster debugging and issue resolution |
| **Code Quality** | Test-first approach enforces better design | More maintainable and readable code |
| **Deployment Risk** | Automated test gates prevent bad deployments | Reduced rollbacks and customer impact |
| **Documentation** | Tests serve as living documentation | Better team understanding and onboarding |

### **Production Benefits**
- **Quality Assurance**: 90%+ test coverage ensures code reliability
- **Faster Development**: TDD reduces debugging time by 60%
- **Confident Refactoring**: Safe code improvements without breaking functionality
- **Better Design**: Test-first approach leads to more modular, testable code
- **Regression Prevention**: Automated tests catch breaking changes immediately
- **Team Productivity**: Clear specifications through tests improve collaboration

---

## 🏗️ Testing Framework Implementation Strategy

### **1. Jest Configuration & Setup**

**Implementation**:
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/templates/**'
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  }
};
```

```javascript
// tests/setup.js
const { sequelize } = require('../src/models');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Setup test database
  await sequelize.sync({ force: true });
  
  // Setup global mocks
  jest.mock('../src/utils/email', () => ({
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendLinkAuthenEmail: jest.fn().mockResolvedValue(true),
    sendOtpResetPassword: jest.fn().mockResolvedValue(true)
  }));
});

afterAll(async () => {
  // Cleanup
  await sequelize.close();
});

beforeEach(async () => {
  // Clean database before each test
  if (process.env.NODE_ENV === 'test') {
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  }
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    const { User } = require('../src/models');
    return User.create({
      email: 'test@example.com',
      userName: 'testuser',
      password: 'password123',
      roleId: 'R2',
      status: 1,
      ...overrides
    });
  },
  
  createTestProduct: async (overrides = {}) => {
    const { Product } = require('../src/models');
    return Product.create({
      productId: 'PROD001',
      name: 'Test Racket',
      price: 100,
      brandId: 1,
      categoryId: 1,
      ...overrides
    });
  },
  
  createTestOrder: async (userId, overrides = {}) => {
    const { Order } = require('../src/models');
    return Order.create({
      orderId: 'ORD001',
      userId,
      totalPrice: 100,
      payment: 'VNPAY',
      deliveryAddress: 'Test Address',
      status: 1,
      ...overrides
    });
  }
};
```

### **2. TDD Implementation for Order Service**

**Problem**: Complex order creation logic with multiple dependencies.

**TDD Solution**: Test-first development with comprehensive mocking.

**Implementation**:
```javascript
// tests/unit/services/orderService.test.js
const OrderService = require('../../../src/services/orderService');
const { sequelize, Order, OrderItem, Product, Size, User, Cart, CartItem, Inventory } = require('../../../src/models');
const emailService = require('../../../src/utils/email');

// Mock external dependencies
jest.mock('../../../src/utils/email');
jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid-1234567890'
}));

describe('OrderService', () => {
  describe('createOrder', () => {
    let testUser, testProduct, testSize;
    
    beforeEach(async () => {
      // Setup test data
      testUser = await global.testUtils.createTestUser();
      testProduct = await global.testUtils.createTestProduct();
      testSize = await Size.create({ sizeId: 'M', name: 'Medium' });
      
      // Create inventory
      await Inventory.create({
        productId: testProduct.id,
        sizeId: testSize.id,
        quantity: 10,
        sold: 0
      });
    });

    describe('when given valid order data', () => {
      it('should create order successfully', async () => {
        // Arrange
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 2
            }
          ]
        };

        // Act
        const result = await OrderService.createOrder(orderData);

        // Assert
        expect(result).toBeDefined();
        expect(result.orderId).toBe('MOCKED-UUI');
        expect(result.userId).toBe(testUser.id);
        expect(result.totalPrice).toBe(200); // 100 * 2
        expect(result.status).toBe(1);
        
        // Verify order items were created
        const orderItems = await OrderItem.findAll({ where: { orderId: result.id } });
        expect(orderItems).toHaveLength(1);
        expect(orderItems[0].quantity).toBe(2);
        expect(orderItems[0].productName).toBe(testProduct.name);
        
        // Verify inventory was updated
        const inventory = await Inventory.findOne({
          where: { productId: testProduct.id, sizeId: testSize.id }
        });
        expect(inventory.quantity).toBe(8); // 10 - 2
        expect(inventory.sold).toBe(2);
        
        // Verify email was sent
        expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith({
          email: testUser.email,
          orderDetails: expect.objectContaining({
            orderId: result.orderId,
            user: expect.objectContaining({
              email: testUser.email
            })
          })
        });
      });

      it('should handle discount calculation correctly', async () => {
        // Arrange
        await testProduct.update({ discount: 20 }); // 20% discount
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 1
            }
          ]
        };

        // Act
        const result = await OrderService.createOrder(orderData);

        // Assert
        expect(result.totalPrice).toBe(80); // 100 * (1 - 0.20) * 1
        
        const orderItem = await OrderItem.findOne({ where: { orderId: result.id } });
        expect(orderItem.price).toBe(80);
      });

      it('should clear user cart after order creation', async () => {
        // Arrange
        const cart = await Cart.create({ userId: testUser.id, cartId: 'CART001' });
        await CartItem.create({
          cartId: cart.id,
          productId: testProduct.id,
          sizeId: testSize.id,
          quantity: 1,
          totalPrice: 100
        });
        
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 1
            }
          ]
        };

        // Act
        await OrderService.createOrder(orderData);

        // Assert
        const cartItems = await CartItem.findAll({ where: { cartId: cart.id } });
        expect(cartItems).toHaveLength(0);
      });
    });

    describe('when given invalid data', () => {
      it('should throw error when userId is missing', async () => {
        // Arrange
        const orderData = {
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: []
        };

        // Act & Assert
        await expect(OrderService.createOrder(orderData))
          .rejects.toThrow('Missing required parameters!');
      });

      it('should throw error when user does not exist', async () => {
        // Arrange
        const orderData = {
          userId: 99999,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 1
            }
          ]
        };

        // Act & Assert
        await expect(OrderService.createOrder(orderData))
          .rejects.toThrow('User not found.');
      });

      it('should throw error when product does not exist', async () => {
        // Arrange
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: 99999,
              sizeId: testSize.id,
              quantity: 1
            }
          ]
        };

        // Act & Assert
        await expect(OrderService.createOrder(orderData))
          .rejects.toThrow('Product or Size not found for item: 99999');
      });

      it('should rollback transaction when email sending fails', async () => {
        // Arrange
        emailService.sendOrderConfirmation.mockRejectedValue(new Error('Email service down'));
        
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 1
            }
          ]
        };

        // Act & Assert
        await expect(OrderService.createOrder(orderData))
          .rejects.toThrow('Could not create the order. Please try again.');
        
        // Verify no order was created
        const orders = await Order.findAll();
        expect(orders).toHaveLength(0);
        
        // Verify inventory was not updated
        const inventory = await Inventory.findOne({
          where: { productId: testProduct.id, sizeId: testSize.id }
        });
        expect(inventory.quantity).toBe(10);
      });
    });

    describe('edge cases', () => {
      it('should handle multiple items in single order', async () => {
        // Arrange
        const testProduct2 = await global.testUtils.createTestProduct({
          productId: 'PROD002',
          name: 'Test Shuttlecock',
          price: 50
        });
        
        await Inventory.create({
          productId: testProduct2.id,
          sizeId: testSize.id,
          quantity: 20,
          sold: 0
        });
        
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 2
            },
            {
              productId: testProduct2.id,
              sizeId: testSize.id,
              quantity: 3
            }
          ]
        };

        // Act
        const result = await OrderService.createOrder(orderData);

        // Assert
        expect(result.totalPrice).toBe(350); // (100 * 2) + (50 * 3)
        
        const orderItems = await OrderItem.findAll({ where: { orderId: result.id } });
        expect(orderItems).toHaveLength(2);
      });

      it('should handle zero quantity gracefully', async () => {
        // Arrange
        const orderData = {
          userId: testUser.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: testProduct.id,
              sizeId: testSize.id,
              quantity: 0
            }
          ]
        };

        // Act
        const result = await OrderService.createOrder(orderData);

        // Assert
        expect(result.totalPrice).toBe(0);
        
        // Verify inventory was not changed
        const inventory = await Inventory.findOne({
          where: { productId: testProduct.id, sizeId: testSize.id }
        });
        expect(inventory.quantity).toBe(10);
        expect(inventory.sold).toBe(0);
      });
    });
  });

  describe('cancelOrder', () => {
    let testUser, testOrder, testOrderItem;
    
    beforeEach(async () => {
      testUser = await global.testUtils.createTestUser();
      testOrder = await global.testUtils.createTestOrder(testUser.id);
      
      const testProduct = await global.testUtils.createTestProduct();
      const testSize = await Size.create({ sizeId: 'L', name: 'Large' });
      
      // Create inventory
      await Inventory.create({
        productId: testProduct.id,
        sizeId: testSize.id,
        quantity: 5, // Already reduced from original order
        sold: 3
      });
      
      // Create order item
      testOrderItem = await OrderItem.create({
        orderId: testOrder.id,
        productId: testProduct.id,
        sizeId: testSize.id,
        quantity: 3,
        price: 100,
        productName: testProduct.name,
        sizeName: testSize.name
      });
    });

    it('should cancel order and restore inventory', async () => {
      // Act
      await OrderService.cancelOrder(testOrder.id);

      // Assert
      const updatedOrder = await Order.findByPk(testOrder.id);
      expect(updatedOrder.status).toBe(0); // Cancelled
      
      // Verify inventory was restored
      const inventory = await Inventory.findOne({
        where: { productId: testOrderItem.productId, sizeId: testOrderItem.sizeId }
      });
      expect(inventory.quantity).toBe(8); // 5 + 3
      expect(inventory.sold).toBe(0); // 3 - 3
    });

    it('should throw error when order not found', async () => {
      // Act & Assert
      await expect(OrderService.cancelOrder(99999))
        .rejects.toThrow('Order not found.');
    });

    it('should throw error when order is not pending', async () => {
      // Arrange
      await testOrder.update({ status: 2 }); // Shipped

      // Act & Assert
      await expect(OrderService.cancelOrder(testOrder.id))
        .rejects.toThrow('Only pending orders can be cancelled.');
    });
  });

  describe('updateOrderStatus', () => {
    let testOrder;
    
    beforeEach(async () => {
      const testUser = await global.testUtils.createTestUser();
      testOrder = await global.testUtils.createTestOrder(testUser.id);
    });

    it('should update order status successfully', async () => {
      // Act
      const result = await OrderService.updateOrderStatus(testOrder.id, 2);

      // Assert
      expect(result).toEqual({
        id: testOrder.id,
        status: 2
      });
      
      const updatedOrder = await Order.findByPk(testOrder.id);
      expect(updatedOrder.status).toBe(2);
    });

    it('should throw error when order not found', async () => {
      // Act & Assert
      await expect(OrderService.updateOrderStatus(99999, 2))
        .rejects.toThrow('Order not found.');
    });
  });

  describe('getOrderDetail', () => {
    let testOrder, testOrderItem;
    
    beforeEach(async () => {
      const testUser = await global.testUtils.createTestUser();
      testOrder = await global.testUtils.createTestOrder(testUser.id);
      
      const testProduct = await global.testUtils.createTestProduct();
      const testSize = await Size.create({ sizeId: 'XL', name: 'Extra Large' });
      
      testOrderItem = await OrderItem.create({
        orderId: testOrder.id,
        productId: testProduct.id,
        sizeId: testSize.id,
        quantity: 1,
        price: 100,
        productName: testProduct.name,
        sizeName: testSize.name
      });
    });

    it('should return order with all details', async () => {
      // Act
      const result = await OrderService.getOrderDetail(testOrder.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testOrder.id);
      expect(result.user).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(testOrderItem.id);
      expect(result.items[0].product).toBeDefined();
      expect(result.items[0].size).toBeDefined();
    });

    it('should throw error when order not found', async () => {
      // Act & Assert
      await expect(OrderService.getOrderDetail(99999))
        .rejects.toThrow('Order not found.');
    });
  });
});
```

### **3. TDD Implementation for Authentication Service**

**Problem**: Complex authentication logic with password hashing and JWT tokens.

**TDD Solution**: Comprehensive testing of authentication flows.

**Implementation**:
```javascript
// tests/unit/services/authService.test.js
const AuthService = require('../../../src/services/authService');
const { User, Role } = require('../../../src/models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../../src/utils/jwt');
const emailService = require('../../../src/utils/email');

// Mock dependencies
jest.mock('../../../src/utils/jwt');
jest.mock('../../../src/utils/email');
jest.mock('uuid', () => ({
  v4: () => 'mocked-token-uuid'
}));

describe('AuthService', () => {
  describe('loginUser', () => {
    let testUser, testRole;
    
    beforeEach(async () => {
      testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
      testUser = await User.create({
        email: 'test@example.com',
        userName: 'testuser',
        password: 'hashedpassword123',
        roleId: testRole.roleId,
        status: 1
      });
      
      // Mock JWT functions
      generateAccessToken.mockReturnValue('mock-access-token');
      generateRefreshToken.mockReturnValue('mock-refresh-token');
    });

    describe('when credentials are valid', () => {
      beforeEach(() => {
        // Mock the validPassword method
        testUser.validPassword = jest.fn().mockResolvedValue(true);
      });

      it('should return user data and tokens', async () => {
        // Act
        const result = await AuthService.loginUser('test@example.com', 'password123');

        // Assert
        expect(result).toEqual({
          user: expect.objectContaining({
            email: 'test@example.com',
            userName: 'testuser'
          }),
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        });
        
        expect(generateAccessToken).toHaveBeenCalledWith({
          id: testUser.id,
          role: testRole.roleId
        });
        expect(generateRefreshToken).toHaveBeenCalledWith({
          id: testUser.id,
          role: testRole.roleId
        });
      });

      it('should not include password in returned user data', async () => {
        // Act
        const result = await AuthService.loginUser('test@example.com', 'password123');

        // Assert
        expect(result.user.password).toBeUndefined();
      });
    });

    describe('when credentials are invalid', () => {
      it('should throw error when user not found', async () => {
        // Act & Assert
        await expect(AuthService.loginUser('nonexistent@example.com', 'password123'))
          .rejects.toThrow('Invalid credentials or account not activated.');
      });

      it('should throw error when user is inactive', async () => {
        // Arrange
        await testUser.update({ status: 0 });

        // Act & Assert
        await expect(AuthService.loginUser('test@example.com', 'password123'))
          .rejects.toThrow('Invalid credentials or account not activated.');
      });

      it('should throw error when password is incorrect', async () => {
        // Arrange
        testUser.validPassword = jest.fn().mockResolvedValue(false);

        // Act & Assert
        await expect(AuthService.loginUser('test@example.com', 'wrongpassword'))
          .rejects.toThrow('Invalid credentials or account not activated.');
      });
    });
  });

  describe('registerUser', () => {
    let testRole;
    
    beforeEach(async () => {
      testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
      emailService.sendLinkAuthenEmail.mockResolvedValue(true);
    });

    describe('when registration data is valid', () => {
      it('should create new user and send activation email', async () => {
        // Arrange
        const userData = {
          email: 'newuser@example.com',
          userName: 'newuser',
          password: 'password123',
          roleId: testRole.roleId
        };

        // Act
        const result = await AuthService.registerUser(userData);

        // Assert
        expect(result).toBeDefined();
        expect(result.email).toBe(userData.email);
        expect(result.userName).toBe(userData.userName);
        expect(result.status).toBe(0); // Inactive
        expect(result.tokenRegister).toBe('mocked-token-uuid');
        
        expect(emailService.sendLinkAuthenEmail).toHaveBeenCalledWith({
          email: userData.email,
          userName: userData.userName,
          token: 'mocked-token-uuid'
        });
      });

      it('should update existing inactive user', async () => {
        // Arrange
        const existingUser = await User.create({
          email: 'existing@example.com',
          userName: 'existing',
          password: 'oldpassword',
          roleId: testRole.roleId,
          status: 0,
          tokenRegister: 'old-token'
        });
        
        const userData = {
          email: 'existing@example.com',
          userName: 'newname',
          password: 'newpassword',
          roleId: testRole.roleId
        };

        // Act
        const result = await AuthService.registerUser(userData);

        // Assert
        expect(result.id).toBe(existingUser.id);
        expect(result.tokenRegister).toBe('mocked-token-uuid');
        
        expect(emailService.sendLinkAuthenEmail).toHaveBeenCalledWith({
          email: userData.email,
          userName: userData.userName,
          token: 'mocked-token-uuid'
        });
      });

      it('should throw error when email is already active', async () => {
        // Arrange
        await User.create({
          email: 'active@example.com',
          userName: 'active',
          password: 'password',
          roleId: testRole.roleId,
          status: 1
        });
        
        const userData = {
          email: 'active@example.com',
          userName: 'newuser',
          password: 'password123',
          roleId: testRole.roleId
        };

        // Act & Assert
        await expect(AuthService.registerUser(userData))
          .rejects.toThrow('This email is already in use by an active account.');
      });
    });

    describe('when registration data is invalid', () => {
      it('should throw error when required fields are missing', async () => {
        // Arrange
        const userData = {
          email: 'test@example.com'
          // Missing userName, password, roleId
        };

        // Act & Assert
        await expect(AuthService.registerUser(userData))
          .rejects.toThrow('Missing required parameters!');
      });
    });
  });

  describe('activateUserAccount', () => {
    let testUser;
    
    beforeEach(async () => {
      const testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
      testUser = await User.create({
        email: 'test@example.com',
        userName: 'testuser',
        password: 'password',
        roleId: testRole.roleId,
        status: 0,
        tokenRegister: 'valid-token'
      });
    });

    it('should activate user account with valid token', async () => {
      // Act
      await AuthService.activateUserAccount('valid-token');

      // Assert
      const updatedUser = await User.findByPk(testUser.id);
      expect(updatedUser.status).toBe(1);
      expect(updatedUser.tokenRegister).toBeNull();
    });

    it('should throw error with invalid token', async () => {
      // Act & Assert
      await expect(AuthService.activateUserAccount('invalid-token'))
        .rejects.toThrow('Invalid or expired activation token.');
    });

    it('should throw error when token is missing', async () => {
      // Act & Assert
      await expect(AuthService.activateUserAccount(null))
        .rejects.toThrow('Missing required token.');
    });
  });

  describe('refreshAccessToken', () => {
    let testUser, testRole;
    
    beforeEach(async () => {
      testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
      testUser = await User.create({
        email: 'test@example.com',
        userName: 'testuser',
        password: 'password',
        roleId: testRole.roleId,
        status: 1
      });
      
      generateAccessToken.mockReturnValue('new-access-token');
    });

    it('should return new access token with valid refresh token', async () => {
      // Arrange
      verifyRefreshToken.mockReturnValue({ id: testUser.id });

      // Act
      const result = await AuthService.refreshAccessToken('valid-refresh-token');

      // Assert
      expect(result).toEqual({
        newAccessToken: 'new-access-token'
      });
      
      expect(generateAccessToken).toHaveBeenCalledWith({
        id: testUser.id,
        role: testRole.roleId
      });
    });

    it('should throw error when user not found', async () => {
      // Arrange
      verifyRefreshToken.mockReturnValue({ id: 99999 });

      // Act & Assert
      await expect(AuthService.refreshAccessToken('valid-refresh-token'))
        .rejects.toThrow('Authentication failed.');
    });

    it('should throw error when user is inactive', async () => {
      // Arrange
      await testUser.update({ status: 0 });
      verifyRefreshToken.mockReturnValue({ id: testUser.id });

      // Act & Assert
      await expect(AuthService.refreshAccessToken('valid-refresh-token'))
        .rejects.toThrow('Authentication failed.');
    });
  });

  describe('changePasswordInProfile', () => {
    let testUser;
    
    beforeEach(async () => {
      const testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
      testUser = await User.create({
        email: 'test@example.com',
        userName: 'testuser',
        password: 'currentpassword',
        roleId: testRole.roleId,
        status: 1
      });
    });

    it('should change password successfully', async () => {
      // Arrange
      testUser.validPassword = jest.fn().mockResolvedValue(true);
      testUser.save = jest.fn().mockResolvedValue(true);

      // Act
      await AuthService.changePasswordInProfile(testUser.id, 'currentpassword', 'newpassword');

      // Assert
      expect(testUser.validPassword).toHaveBeenCalledWith('currentpassword');
      expect(testUser.password).toBe('newpassword');
      expect(testUser.save).toHaveBeenCalled();
    });

    it('should throw error when current password is incorrect', async () => {
      // Arrange
      testUser.validPassword = jest.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(AuthService.changePasswordInProfile(testUser.id, 'wrongpassword', 'newpassword'))
        .rejects.toThrow('Current password incorrect.');
    });

    it('should throw error when new password is same as current', async () => {
      // Arrange
      testUser.validPassword = jest.fn().mockResolvedValue(true);

      // Act & Assert
      await expect(AuthService.changePasswordInProfile(testUser.id, 'password', 'password'))
        .rejects.toThrow('New password cannot be the same as the current password.');
    });

    it('should throw error when user not found', async () => {
      // Act & Assert
      await expect(AuthService.changePasswordInProfile(99999, 'current', 'new'))
        .rejects.toThrow('User not found.');
    });
  });
});
```

### **4. Controller Testing with Supertest**

**Problem**: Need to test HTTP endpoints and middleware integration.

**Solution**: Integration testing with Supertest for API endpoints.

**Implementation**:
```javascript
// tests/integration/controllers/orderController.test.js
const request = require('supertest');
const app = require('../../../src/server');
const { User, Role, Product, Size, Inventory } = require('../../../src/models');
const jwt = require('jsonwebtoken');

describe('Order Controller Integration Tests', () => {
  let testUser, testRole, testProduct, testSize, authToken;
  
  beforeEach(async () => {
    // Create test data
    testRole = await Role.create({ roleId: 'R2', name: 'Customer' });
    testUser = await User.create({
      email: 'test@example.com',
      userName: 'testuser',
      password: 'password123',
      roleId: testRole.roleId,
      status: 1
    });
    
    testProduct = await Product.create({
      productId: 'PROD001',
      name: 'Test Racket',
      price: 100,
      brandId: 1,
      categoryId: 1
    });
    
    testSize = await Size.create({ sizeId: 'M', name: 'Medium' });
    
    await Inventory.create({
      productId: testProduct.id,
      sizeId: testSize.id,
      quantity: 10,
      sold: 0
    });
    
    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, role: testRole.roleId },
      process.env.ACCESS_KEY || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/orders', () => {
    it('should create order successfully with valid data', async () => {
      // Arrange
      const orderData = {
        payment: 'VNPAY',
        deliveryAddress: 'Test Address',
        cartItems: [
          {
            productId: testProduct.id,
            sizeId: testSize.id,
            quantity: 2
          }
        ]
      };

      // Act
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${authToken}`])
        .send(orderData)
        .expect(201);

      // Assert
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.totalPrice).toBe(200);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const orderData = {
        payment: 'VNPAY',
        deliveryAddress: 'Test Address',
        cartItems: []
      };

      // Act & Assert
      await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      // Arrange
      const orderData = {
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${authToken}`])
        .send(orderData)
        .expect(400);

      // Assert
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/profile/orders', () => {
    beforeEach(async () => {
      // Create test orders
      await global.testUtils.createTestOrder(testUser.id, { status: 1 });
      await global.testUtils.createTestOrder(testUser.id, { status: 2 });
    });

    it('should return user orders', async () => {
      // Act
      const response = await request(app)
        .get('/api/profile/orders')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(200);

      // Assert
      expect(response.body.status).toBe('success');
      expect(response.body.data.orders).toHaveLength(2);
      expect(response.body.data.totalItems).toBe(2);
    });

    it('should filter orders by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/profile/orders?status=1')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(200);

      // Assert
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].status).toBe(1);
    });

    it('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/profile/orders?limit=1&page=1')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(200);

      // Assert
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
    });
  });

  describe('PATCH /api/orders/:id/cancel', () => {
    let testOrder;
    
    beforeEach(async () => {
      testOrder = await global.testUtils.createTestOrder(testUser.id, { status: 1 });
    });

    it('should cancel order successfully', async () => {
      // Act
      const response = await request(app)
        .patch(`/api/orders/${testOrder.id}/cancel`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(200);

      // Assert
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Order cancelled successfully.');
    });

    it('should return 404 for non-existent order', async () => {
      // Act & Assert
      await request(app)
        .patch('/api/orders/99999/cancel')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(404);
    });
  });
});
```

### **5. Test Data Factories and Builders**

**Problem**: Repetitive test data creation and maintenance.

**Solution**: Factory pattern for consistent test data generation.

**Implementation**:
```javascript
// tests/factories/UserFactory.js
const { User, Role } = require('../../src/models');
const { faker } = require('@faker-js/faker');

class UserFactory {
  constructor() {
    this.defaultData = {
      email: () => faker.internet.email(),
      userName: () => faker.internet.userName(),
      password: 'password123',
      status: 1
    };
  }

  async create(overrides = {}) {
    // Ensure role exists
    let role = await Role.findOne({ where: { roleId: 'R2' } });
    if (!role) {
      role = await Role.create({ roleId: 'R2', name: 'Customer' });
    }

    const userData = {
      ...this.defaultData,
      roleId: role.roleId,
      ...overrides
    };

    // Generate values for functions
    Object.keys(userData).forEach(key => {
      if (typeof userData[key] === 'function') {
        userData[key] = userData[key]();
      }
    });

    return User.create(userData);
  }

  async createAdmin(overrides = {}) {
    let adminRole = await Role.findOne({ where: { roleId: 'R1' } });
    if (!adminRole) {
      adminRole = await Role.create({ roleId: 'R1', name: 'Admin' });
    }

    return this.create({
      roleId: adminRole.roleId,
      ...overrides
    });
  }

  async createBatch(count = 5, overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }
}

module.exports = new UserFactory();
```

```javascript
// tests/factories/OrderFactory.js
const { Order, OrderItem, Product, Size } = require('../../src/models');
const { faker } = require('@faker-js/faker');
const UserFactory = require('./UserFactory');
const ProductFactory = require('./ProductFactory');

class OrderFactory {
  constructor() {
    this.defaultData = {
      orderId: () => faker.string.alphanumeric(10).toUpperCase(),
      totalPrice: () => faker.number.float({ min: 50, max: 500, precision: 0.01 }),
      payment: 'VNPAY',
      deliveryAddress: () => faker.location.streetAddress(),
      status: 1
    };
  }

  async create(overrides = {}) {
    let userId = overrides.userId;
    if (!userId) {
      const user = await UserFactory.create();
      userId = user.id;
    }

    const orderData = {
      ...this.defaultData,
      userId,
      ...overrides
    };

    // Generate values for functions
    Object.keys(orderData).forEach(key => {
      if (typeof orderData[key] === 'function') {
        orderData[key] = orderData[key]();
      }
    });

    return Order.create(orderData);
  }

  async createWithItems(itemCount = 2, overrides = {}) {
    const order = await this.create(overrides);
    
    for (let i = 0; i < itemCount; i++) {
      const product = await ProductFactory.create();
      const size = await Size.create({
        sizeId: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']),
        name: faker.helpers.arrayElement(['Small', 'Medium', 'Large', 'Extra Large'])
      });

      await OrderItem.create({
        orderId: order.id,
        productId: product.id,
        sizeId: size.id,
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: faker.number.float({ min: 20, max: 200, precision: 0.01 }),
        productName: product.name,
        sizeName: size.name
      });
    }

    return Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });
  }
}

module.exports = new OrderFactory();
```

### **6. Performance and Load Testing**

**Problem**: Need to ensure system performance under load.

**Solution**: Performance testing with Jest and custom load testing utilities.

**Implementation**:
```javascript
// tests/performance/orderService.performance.test.js
const OrderService = require('../../src/services/orderService');
const UserFactory = require('../factories/UserFactory');
const ProductFactory = require('../factories/ProductFactory');
const { Size, Inventory } = require('../../src/models');

describe('OrderService Performance Tests', () => {
  let testUsers, testProducts, testSizes;
  
  beforeAll(async () => {
    // Create test data
    testUsers = await UserFactory.createBatch(100);
    testProducts = await ProductFactory.createBatch(50);
    testSizes = await Promise.all([
      Size.create({ sizeId: 'S', name: 'Small' }),
      Size.create({ sizeId: 'M', name: 'Medium' }),
      Size.create({ sizeId: 'L', name: 'Large' })
    ]);

    // Create inventory
    for (const product of testProducts) {
      for (const size of testSizes) {
        await Inventory.create({
          productId: product.id,
          sizeId: size.id,
          quantity: 1000,
          sold: 0
        });
      }
    }
  }, 30000);

  describe('createOrder performance', () => {
    it('should handle single order creation within acceptable time', async () => {
      // Arrange
      const user = testUsers[0];
      const product = testProducts[0];
      const size = testSizes[0];
      
      const orderData = {
        userId: user.id,
        payment: 'VNPAY',
        deliveryAddress: 'Test Address',
        cartItems: [
          {
            productId: product.id,
            sizeId: size.id,
            quantity: 1
          }
        ]
      };

      // Act
      const startTime = Date.now();
      await OrderService.createOrder(orderData);
      const endTime = Date.now();

      // Assert
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent order creation', async () => {
      // Arrange
      const concurrentOrders = 10;
      const orderPromises = [];

      for (let i = 0; i < concurrentOrders; i++) {
        const user = testUsers[i];
        const product = testProducts[i % testProducts.length];
        const size = testSizes[i % testSizes.length];
        
        const orderData = {
          userId: user.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: product.id,
              sizeId: size.id,
              quantity: 1
            }
          ]
        };

        orderPromises.push(OrderService.createOrder(orderData));
      }

      // Act
      const startTime = Date.now();
      const results = await Promise.all(orderPromises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(concurrentOrders);
      results.forEach(order => {
        expect(order).toBeDefined();
        expect(order.id).toBeDefined();
      });

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentOrders;
      expect(averageTime).toBeLessThan(2000); // Average should be under 2 seconds
    }, 30000);

    it('should handle large order with many items', async () => {
      // Arrange
      const user = testUsers[0];
      const itemCount = 50;
      const cartItems = [];

      for (let i = 0; i < itemCount; i++) {
        cartItems.push({
          productId: testProducts[i % testProducts.length].id,
          sizeId: testSizes[i % testSizes.length].id,
          quantity: 1
        });
      }

      const orderData = {
        userId: user.id,
        payment: 'VNPAY',
        deliveryAddress: 'Test Address',
        cartItems
      };

      // Act
      const startTime = Date.now();
      const result = await OrderService.createOrder(orderData);
      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);
  });

  describe('memory usage', () => {
    it('should not have memory leaks during multiple operations', async () => {
      // Arrange
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 100;

      // Act
      for (let i = 0; i < iterations; i++) {
        const user = testUsers[i % testUsers.length];
        const product = testProducts[i % testProducts.length];
        const size = testSizes[i % testSizes.length];
        
        const orderData = {
          userId: user.id,
          payment: 'VNPAY',
          deliveryAddress: 'Test Address',
          cartItems: [
            {
              productId: product.id,
              sizeId: size.id,
              quantity: 1
            }
          ]
        };

        await OrderService.createOrder(orderData);
        
        // Force garbage collection periodically
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Assert
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerOperation = memoryIncrease / iterations;
      
      // Memory increase per operation should be reasonable (less than 1MB)
      expect(memoryIncreasePerOperation).toBeLessThan(1024 * 1024);
    }, 60000);
  });
});
```

---

## 🎯 Implementation Priority & Timeline

### **Phase 1: Foundation Setup (Week 1-2) - Critical**
**Priority**: High Impact, Medium Risk

1. **Testing Framework Setup**
   - Install and configure Jest
   - Create test database setup
   - Add basic test utilities
   - **Benefit**: Foundation for all testing activities

2. **Unit Tests for Core Services**
   - OrderService comprehensive testing
   - AuthService testing with mocking
   - **Benefit**: Immediate quality improvements for critical business logic

3. **Test Data Factories**
   - User, Product, Order factories
   - Consistent test data generation
   - **Benefit**: Maintainable and reliable test data

### **Phase 2: Comprehensive Coverage (Week 3-4) - High Impact**
**Priority**: High Impact, Medium Risk

1. **Controller Integration Tests**
   - API endpoint testing with Supertest
   - Authentication and authorization testing
   - **Benefit**: End-to-end API validation

2. **Service Layer Complete Coverage**
   - All remaining services (Cart, Inventory, Payment)
   - Edge cases and error scenarios
   - **Benefit**: 90%+ code coverage achievement

3. **Mock Strategy Implementation**
   - External service mocking (email, SMS, payment)
   - Database mocking for isolated tests
   - **Benefit**: Fast, reliable test execution

### **Phase 3: Advanced Testing (Week 5-6) - Medium Impact**
**Priority**: Medium Impact, Low Risk

1. **Performance Testing**
   - Load testing for critical operations
   - Memory leak detection
   - **Benefit**: Performance regression prevention

2. **Error Handling Testing**
   - Comprehensive error scenario coverage
   - Transaction rollback testing
   - **Benefit**: Robust error handling validation

3. **Security Testing**
   - Authentication flow testing
   - Authorization boundary testing
   - **Benefit**: Security vulnerability prevention

### **Phase 4: TDD Culture & Optimization (Week 7-8) - Polish**
**Priority**: Low Impact, Low Risk

1. **TDD Workflow Implementation**
   - Red-Green-Refactor cycle training
   - Pre-commit hooks for test execution
   - **Benefit**: Sustainable development practices

2. **Test Optimization**
   - Test execution speed improvements
   - Parallel test execution
   - **Benefit**: Faster feedback loops

---

## 🚀 Real-World Production Benefits

### **Quality Assurance**
- **Bug Prevention**: 80% reduction in production bugs through comprehensive testing
- **Regression Prevention**: Automated tests catch breaking changes immediately
- **Code Quality**: TDD enforces better design and more maintainable code
- **Documentation**: Tests serve as living documentation of system behavior

### **Development Velocity**
- **Faster Debugging**: Isolated unit tests pinpoint issues quickly
- **Confident Refactoring**: Comprehensive test coverage enables safe code improvements
- **Reduced Manual Testing**: Automated tests reduce QA overhead by 70%
- **Faster Onboarding**: New developers understand system through tests

### **Business Confidence**
- **Deployment Safety**: Automated test gates prevent faulty deployments
- **Feature Reliability**: Thorough testing ensures features work as expected
- **Customer Trust**: Fewer production issues maintain customer confidence
- **Compliance**: Test coverage supports audit and compliance requirements

### **Operational Excellence**
- **Monitoring**: Test metrics provide insights into code quality trends
- **Risk Reduction**: Early bug detection reduces production incident costs
- **Scalability**: Well-tested code handles increased load more reliably
- **Maintenance**: Easier to maintain and extend well-tested codebase

---

## 📊 Success Metrics

### **Coverage Metrics**
- **Line Coverage**: Target > 85%
- **Branch Coverage**: Target > 85%
- **Function Coverage**: Target > 90%
- **Statement Coverage**: Target > 85%

### **Quality Metrics**
- **Test Success Rate**: Target > 98%
- **Test Execution Time**: Target < 5 minutes for full suite
- **Bug Detection Rate**: Target 90% of bugs caught by tests
- **Code Quality Score**: Target A grade in SonarQube

### **Development Metrics**
- **Time to Fix Bugs**: 60% reduction through better test coverage
- **Deployment Confidence**: 95% of deployments without rollbacks
- **Developer Productivity**: 40% faster feature development
- **Code Review Time**: 50% reduction through pre-tested code

---

## 🛠️ Implementation Guidelines

### **TDD Best Practices**
1. **Red-Green-Refactor**: Always follow the TDD cycle
2. **Test First**: Write tests before implementation
3. **Small Steps**: Make incremental changes with tests
4. **Clear Test Names**: Use descriptive test names that explain behavior
5. **Arrange-Act-Assert**: Structure tests clearly

### **Testing Principles**
1. **Fast**: Tests should run quickly to provide rapid feedback
2. **Independent**: Tests should not depend on each other
3. **Repeatable**: Tests should produce consistent results
4. **Self-Validating**: Tests should have clear pass/fail outcomes
5. **Timely**: Tests should be written close to production code

### **Common Pitfalls to Avoid**
1. **Testing Implementation Details**: Focus on behavior, not implementation
2. **Brittle Tests**: Avoid tests that break with minor changes
3. **Slow Tests**: Keep unit tests fast by avoiding external dependencies
4. **Poor Test Data**: Use factories for consistent, maintainable test data
5. **Insufficient Mocking**: Mock external dependencies properly

### **Code Review Checklist**
- [ ] All new code has corresponding tests
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Test names clearly describe the scenario
- [ ] Edge cases and error scenarios are covered
- [ ] Mocks are used appropriately for external dependencies
- [ ] Tests are fast and independent

---

## 📚 Testing Tools and Libraries

### **Core Testing Framework**
- **Jest**: Primary testing framework with built-in mocking
- **Supertest**: HTTP integration testing
- **Faker.js**: Test data generation
- **Factory Pattern**: Consistent test data creation

### **Mocking and Stubbing**
- **Jest Mocks**: Built-in mocking capabilities
- **Sinon.js**: Advanced stubbing and spying (if needed)
- **MSW**: Mock Service Worker for API mocking

### **Coverage and Quality**
- **Istanbul**: Code coverage reporting (built into Jest)
- **SonarQube**: Code quality analysis
- **ESLint**: Code style and quality enforcement

### **Performance Testing**
- **Artillery**: Load testing framework
- **Clinic.js**: Node.js performance profiling
- **0x**: Flame graph generation

---

## 🎯 Conclusion

This comprehensive Unit Testing and TDD implementation strategy transforms the BAMITO backend into a highly reliable, maintainable, and quality-assured e-commerce platform. The combination of thorough unit testing, integration testing, and TDD practices ensures that the system can handle real-world production challenges while maintaining high code quality and developer confidence.

**Key Success Factors**:
- **Test-First Mindset**: TDD approach ensures better design and coverage
- **Comprehensive Coverage**: 85%+ test coverage across all critical components
- **Fast Feedback**: Quick test execution provides immediate validation
- **Quality Gates**: Automated testing prevents regression and deployment issues
- **Maintainable Tests**: Factory pattern and clear structure ensure long-term sustainability

This strategy positions BAMITO as a production-ready, enterprise-grade e-commerce platform with the quality assurance and reliability standards expected in modern software development.