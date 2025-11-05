# 🔄 BAMITO Backend - Request/Response Lifecycle

## Overview
This document outlines the complete request/response lifecycle for the BAMITO e-commerce backend after implementing all strategic enhancements (Design Patterns, Redis, Message Brokers, ELK Stack, CI/CD, and Testing).

---

## 🚀 Complete Request/Response Flow

### **1. Incoming Request Processing**

```
📥 HTTP Request
    ↓
🛡️ Security Middleware
    ↓
📊 Logging & Monitoring
    ↓
⚡ Caching Layer
    ↓
🔐 Authentication & Authorization
    ↓
✅ Validation
    ↓
🎯 Route Handler
    ↓
🏗️ Controller
    ↓
🧠 Service Layer
    ↓
📦 Repository Pattern
    ↓
💾 Database/Cache
    ↓
📤 Response Processing
    ↓
📋 Response Logging
    ↓
📨 HTTP Response
```

---

## 📋 Detailed Lifecycle Stages

### **Stage 1: Request Entry & Security**
```javascript
// 1. Express.js receives request
app.use(helmet()); // Security headers
app.use(cors()); // CORS handling
app.use(compression()); // Response compression

// 2. Rate limiting (Redis-based)
app.use('/api', rateLimiter({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per window
}));
```

### **Stage 2: Request Logging & Monitoring**
```javascript
// 3. ELK Stack integration
app.use(requestLogger({
  format: 'combined',
  stream: {
    write: (message) => {
      elasticsearchLogger.info({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: message.trim(),
        service: 'bamito-backend',
        environment: process.env.NODE_ENV
      });
    }
  }
}));

// 4. Performance monitoring
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    metricsCollector.recordRequestDuration(req.method, req.route?.path, duration);
  });
  next();
});
```

### **Stage 3: Caching Layer (Redis)**
```javascript
// 5. Cache middleware
app.use('/api/products', cacheMiddleware({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => `products:${req.url}:${JSON.stringify(req.query)}`,
  condition: (req) => req.method === 'GET'
}));

// Cache hit example
const cacheMiddleware = (options) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    const cacheKey = options.keyGenerator(req);
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      logger.info(`Cache HIT: ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }
    
    // Cache miss - continue to handler
    res.sendResponse = res.json;
    res.json = (data) => {
      redisClient.setex(cacheKey, options.ttl, JSON.stringify(data));
      logger.info(`Cache SET: ${cacheKey}`);
      res.sendResponse(data);
    };
    
    next();
  };
};
```

### **Stage 4: Authentication & Authorization (Decorator Pattern)**
```javascript
// 6. JWT Authentication
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    
    // Check Redis blacklist
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AppError('Token is invalid', 401);
    }
    
    const decoded = jwt.verify(token, process.env.ACCESS_KEY);
    req.user = await userRepository.findById(decoded.id);
    
    if (!req.user) {
      throw new AppError('User not found', 401);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// 7. Authorization with Decorator Pattern
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role.roleId)) {
      throw new AppError('Insufficient permissions', 403);
    }
    next();
  };
};
```

### **Stage 5: Request Validation**
```javascript
// 8. Input validation with express-validator
const validateCreateOrder = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').isInt().withMessage('Product ID must be integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('shippingAddress.street').notEmpty().withMessage('Street is required'),
  body('paymentMethod').isIn(['VNPAY', 'COD']).withMessage('Invalid payment method'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400, errors.array());
    }
    next();
  }
];
```

### **Stage 6: Route Handler & Controller**
```javascript
// 9. Route definition
router.post('/orders', 
  authenticateToken,
  requireRole(['customer']),
  validateCreateOrder,
  orderController.createOrder
);

// 10. Controller (Traffic Cop)
const createOrder = async (req, res, next) => {
  try {
    // Log business event
    logger.info('Order creation initiated', {
      userId: req.user.id,
      items: req.body.items.length,
      totalAmount: req.body.totalAmount
    });
    
    // Create command using Factory Pattern
    const command = CommandFactory.createOrderCommand({
      ...req.body,
      userId: req.user.id
    });
    
    // Execute command
    const order = await command.execute();
    
    // Log success
    logger.info('Order created successfully', {
      orderId: order.id,
      userId: req.user.id,
      amount: order.totalAmount
    });
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

### **Stage 7: Service Layer (Business Logic)**
```javascript
// 11. Command Pattern execution
class CreateOrderCommand {
  constructor(orderData, services) {
    this.orderData = orderData;
    this.services = services;
  }
  
  async execute() {
    const unitOfWork = new UnitOfWork();
    
    try {
      await unitOfWork.begin();
      
      // Validate inventory
      await this.services.inventory.validateStock(this.orderData.items);
      
      // Apply voucher if provided
      if (this.orderData.voucherId) {
        await this.services.voucher.validateAndApply(this.orderData.voucherId);
      }
      
      // Create order using Repository Pattern
      const order = await this.services.order.create(this.orderData, unitOfWork.transaction);
      
      // Update inventory
      await this.services.inventory.reserveStock(this.orderData.items, unitOfWork.transaction);
      
      // Clear cart
      await this.services.cart.clear(this.orderData.userId, unitOfWork.transaction);
      
      await unitOfWork.commit();
      
      // Publish events to Message Broker
      await this.publishOrderEvents(order);
      
      return order;
    } catch (error) {
      await unitOfWork.rollback();
      throw error;
    }
  }
  
  async publishOrderEvents(order) {
    // RabbitMQ event publishing
    await messageBroker.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      timestamp: new Date().toISOString()
    });
  }
}
```

### **Stage 8: Repository Pattern & Database**
```javascript
// 12. Repository Pattern
class OrderRepository extends BaseRepository {
  constructor() {
    super(Order);
  }
  
  async create(orderData, transaction) {
    // Use Builder Pattern for complex object creation
    const orderBuilder = new OrderBuilder()
      .setUserId(orderData.userId)
      .setItems(orderData.items)
      .setShippingAddress(orderData.shippingAddress)
      .setPaymentMethod(orderData.paymentMethod)
      .calculateTotals();
    
    const order = await this.model.create(orderBuilder.build(), {
      transaction,
      include: [
        { model: OrderItem, as: 'items' },
        { model: ShippingAddress, as: 'shippingAddress' }
      ]
    });
    
    return order;
  }
}

// 13. Database transaction with Sequelize
const transaction = await sequelize.transaction({
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
});
```

### **Stage 9: Background Job Processing**
```javascript
// 14. Message Broker consumers (RabbitMQ)
class OrderEventConsumer {
  async handleOrderCreated(orderData) {
    try {
      // Send confirmation email
      await emailQueue.add('order-confirmation', {
        userId: orderData.userId,
        orderId: orderData.orderId,
        priority: 'high'
      });
      
      // Update analytics
      await analyticsQueue.add('order-analytics', {
        orderId: orderData.orderId,
        amount: orderData.totalAmount,
        timestamp: orderData.timestamp
      });
      
      // Send SMS notification
      await smsQueue.add('order-sms', {
        userId: orderData.userId,
        orderId: orderData.orderId
      });
      
    } catch (error) {
      logger.error('Order event processing failed', error);
      throw error;
    }
  }
}
```

### **Stage 10: Response Processing**
```javascript
// 15. Response formatting
const formatResponse = (data, message = 'Success') => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: req.id
  };
};

// 16. Response caching (for GET requests)
if (req.method === 'GET' && res.statusCode === 200) {
  const cacheKey = generateCacheKey(req);
  await redisClient.setex(cacheKey, 300, JSON.stringify(responseData));
}
```

### **Stage 11: Error Handling**
```javascript
// 17. Global error handler
const errorHandler = (error, req, res, next) => {
  // Log error to ELK Stack
  logger.error('Request failed', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
  
  // Send error to monitoring
  metricsCollector.recordError(error.name, req.route?.path);
  
  // Format error response
  const errorResponse = {
    success: false,
    error: {
      message: error.message,
      code: error.statusCode || 500,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    timestamp: new Date().toISOString(),
    requestId: req.id
  };
  
  res.status(error.statusCode || 500).json(errorResponse);
};
```

### **Stage 12: Response Logging & Monitoring**
```javascript
// 18. Response logging
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log response
    logger.info('Response sent', {
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
      url: req.url,
      method: req.method,
      userId: req.user?.id,
      requestId: req.id
    });
    
    // Call original send
    originalSend.call(this, data);
  };
  
  next();
});
```

---

## 🔄 Event-Driven Side Effects

### **Asynchronous Processing Flow**
```
Order Created Event
    ↓
📧 Email Queue → Send confirmation email
    ↓
📊 Analytics Queue → Update metrics
    ↓
📱 SMS Queue → Send SMS notification
    ↓
📦 Inventory Queue → Update stock levels
    ↓
🎯 Marketing Queue → Trigger recommendations
```

---

## 📊 Performance Optimizations

### **Caching Strategy**
- **L1 Cache**: In-memory application cache
- **L2 Cache**: Redis distributed cache
- **L3 Cache**: CDN for static assets

### **Database Optimizations**
- **Connection Pooling**: Sequelize connection pool
- **Query Optimization**: Indexed queries and eager loading
- **Read Replicas**: Separate read/write databases

### **Monitoring & Observability**
- **Request Tracing**: Unique request IDs
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Comprehensive error logging
- **Business Metrics**: Order conversion rates and revenue

This lifecycle ensures high performance, reliability, and observability for the BAMITO e-commerce platform.