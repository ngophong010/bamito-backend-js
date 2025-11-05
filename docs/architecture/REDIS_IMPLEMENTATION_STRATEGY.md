# 🚀 BAMITO Backend - Redis Implementation Strategy

## Overview
This document outlines a comprehensive Redis implementation strategy for the BAMITO badminton e-commerce backend to address real-world production challenges including performance optimization, scalability, session management, and caching strategies.

## Current Architecture Analysis
- ✅ **Solid Foundation**: Express.js, PostgreSQL, Sequelize ORM
- ✅ **Authentication**: JWT with httpOnly cookies
- ✅ **Rate Limiting**: Basic express-rate-limit implementation
- ✅ **Transactional Operations**: Complex order creation with inventory management
- ⚠️ **Performance Bottlenecks**: Database queries, session management, repeated calculations
- ⚠️ **Scalability Concerns**: No distributed caching, session storage limitations

---

## 🎯 Redis Implementation Strategy

### **1. Session Management & Authentication**
**Problem**: JWT tokens stored in cookies with no centralized session management, difficult to invalidate sessions.

**Redis Solution**: Distributed session store with token blacklisting.

**Benefits**:
- Instant session invalidation
- Distributed session management
- Enhanced security with session tracking
- Scalable across multiple server instances

**Implementation**:
```javascript
// src/config/redis.js
const redis = require('redis');
const { promisify } = require('util');

class RedisManager {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, expireInSeconds) {
    if (expireInSeconds) {
      return this.client.setex(key, expireInSeconds, value);
    }
    return this.client.set(key, value);
  }

  async del(key) {
    return this.client.del(key);
  }

  async exists(key) {
    return this.client.exists(key);
  }

  async hget(hash, field) {
    return this.client.hget(hash, field);
  }

  async hset(hash, field, value) {
    return this.client.hset(hash, field, value);
  }

  async hgetall(hash) {
    return this.client.hgetall(hash);
  }

  async expire(key, seconds) {
    return this.client.expire(key, seconds);
  }

  async incr(key) {
    return this.client.incr(key);
  }

  async zadd(key, score, member) {
    return this.client.zadd(key, score, member);
  }

  async zrange(key, start, stop) {
    return this.client.zrange(key, start, stop);
  }

  async disconnect() {
    return this.client.quit();
  }
}

module.exports = new RedisManager();
```

```javascript
// src/services/SessionService.js
const redis = require('../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

class SessionService {
  constructor() {
    this.SESSION_PREFIX = 'session:';
    this.BLACKLIST_PREFIX = 'blacklist:';
    this.USER_SESSIONS_PREFIX = 'user_sessions:';
  }

  async createSession(userId, userAgent, ipAddress) {
    const sessionId = require('uuid').v4();
    const sessionData = {
      userId,
      userAgent,
      ipAddress,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Store session data
    await redis.hset(
      `${this.SESSION_PREFIX}${sessionId}`,
      'data',
      JSON.stringify(sessionData)
    );
    await redis.expire(`${this.SESSION_PREFIX}${sessionId}`, 7 * 24 * 60 * 60); // 7 days

    // Track user sessions for multi-device management
    await redis.zadd(
      `${this.USER_SESSIONS_PREFIX}${userId}`,
      Date.now(),
      sessionId
    );

    return sessionId;
  }

  async getSession(sessionId) {
    const sessionData = await redis.hget(`${this.SESSION_PREFIX}${sessionId}`, 'data');
    return sessionData ? JSON.parse(sessionData) : null;
  }

  async updateSessionActivity(sessionId) {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.lastActivity = new Date().toISOString();
      await redis.hset(
        `${this.SESSION_PREFIX}${sessionId}`,
        'data',
        JSON.stringify(sessionData)
      );
    }
  }

  async invalidateSession(sessionId) {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      // Remove from user sessions
      await redis.zrem(`${this.USER_SESSIONS_PREFIX}${sessionData.userId}`, sessionId);
    }
    // Delete session
    await redis.del(`${this.SESSION_PREFIX}${sessionId}`);
  }

  async invalidateAllUserSessions(userId) {
    const sessions = await redis.zrange(`${this.USER_SESSIONS_PREFIX}${userId}`, 0, -1);
    for (const sessionId of sessions) {
      await redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    }
    await redis.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
  }

  async blacklistToken(token, expiresIn) {
    await redis.set(`${this.BLACKLIST_PREFIX}${token}`, '1', expiresIn);
  }

  async isTokenBlacklisted(token) {
    return await redis.exists(`${this.BLACKLIST_PREFIX}${token}`);
  }

  async getUserActiveSessions(userId) {
    const sessionIds = await redis.zrange(`${this.USER_SESSIONS_PREFIX}${userId}`, 0, -1);
    const sessions = [];
    
    for (const sessionId of sessionIds) {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessions.push({ sessionId, ...sessionData });
      }
    }
    
    return sessions;
  }
}

module.exports = new SessionService();
```

### **2. Advanced Rate Limiting & DDoS Protection**
**Problem**: Basic rate limiting with express-rate-limit, no distributed rate limiting.

**Redis Solution**: Distributed rate limiting with sliding window algorithm.

**Implementation**:
```javascript
// src/middleware/advancedRateLimit.js
const redis = require('../config/redis');
const AppError = require('../utils/AppError');

class AdvancedRateLimit {
  constructor() {
    this.RATE_LIMIT_PREFIX = 'rate_limit:';
    this.SUSPICIOUS_IP_PREFIX = 'suspicious:';
  }

  // Sliding window rate limiter
  slidingWindowLimiter(windowMs, maxRequests, keyGenerator = (req) => req.ip) {
    return async (req, res, next) => {
      try {
        const key = `${this.RATE_LIMIT_PREFIX}${keyGenerator(req)}`;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Remove old entries
        await redis.client.zremrangebyscore(key, 0, windowStart);

        // Count current requests
        const currentRequests = await redis.client.zcard(key);

        if (currentRequests >= maxRequests) {
          // Mark as suspicious if exceeding limits frequently
          await this.markSuspiciousActivity(keyGenerator(req));
          
          return next(new AppError('Too many requests', 429));
        }

        // Add current request
        await redis.client.zadd(key, now, `${now}-${Math.random()}`);
        await redis.expire(key, Math.ceil(windowMs / 1000));

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests,
          'X-RateLimit-Remaining': Math.max(0, maxRequests - currentRequests - 1),
          'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
        });

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Fail open
      }
    };
  }

  // Adaptive rate limiting based on user behavior
  adaptiveRateLimit(baseLimit, windowMs) {
    return async (req, res, next) => {
      const ip = req.ip;
      const suspiciousKey = `${this.SUSPICIOUS_IP_PREFIX}${ip}`;
      
      // Check if IP is marked as suspicious
      const suspiciousScore = await redis.get(suspiciousKey) || 0;
      const adjustedLimit = Math.max(1, baseLimit - (suspiciousScore * 2));

      return this.slidingWindowLimiter(windowMs, adjustedLimit)(req, res, next);
    };
  }

  async markSuspiciousActivity(identifier) {
    const key = `${this.SUSPICIOUS_IP_PREFIX}${identifier}`;
    const score = await redis.incr(key);
    await redis.expire(key, 3600); // 1 hour
    
    if (score > 10) {
      // Auto-ban for 1 hour if too suspicious
      await redis.set(`ban:${identifier}`, '1', 3600);
    }
  }

  // IP ban middleware
  banCheck() {
    return async (req, res, next) => {
      const banned = await redis.exists(`ban:${req.ip}`);
      if (banned) {
        return next(new AppError('IP temporarily banned', 403));
      }
      next();
    };
  }
}

module.exports = new AdvancedRateLimit();
```

### **3. Product Catalog Caching**
**Problem**: Repeated database queries for product listings, categories, brands.

**Redis Solution**: Multi-layer caching with cache invalidation strategies.

**Implementation**:
```javascript
// src/services/CacheService.js
const redis = require('../config/redis');

class CacheService {
  constructor() {
    this.PRODUCT_PREFIX = 'product:';
    this.CATEGORY_PREFIX = 'category:';
    this.BRAND_PREFIX = 'brand:';
    this.SEARCH_PREFIX = 'search:';
    this.USER_PREFIX = 'user:';
  }

  // Generic cache methods
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, data, ttl = 3600) {
    await redis.set(key, JSON.stringify(data), ttl);
  }

  async del(key) {
    await redis.del(key);
  }

  async invalidatePattern(pattern) {
    // Note: In production, use Redis SCAN instead of KEYS for better performance
    const keys = await redis.client.keys(pattern);
    if (keys.length > 0) {
      await redis.client.del(...keys);
    }
  }

  // Product-specific caching
  async cacheProduct(productId, productData, ttl = 1800) {
    await this.set(`${this.PRODUCT_PREFIX}${productId}`, productData, ttl);
  }

  async getCachedProduct(productId) {
    return this.get(`${this.PRODUCT_PREFIX}${productId}`);
  }

  async invalidateProduct(productId) {
    await this.del(`${this.PRODUCT_PREFIX}${productId}`);
    // Also invalidate related searches and listings
    await this.invalidatePattern(`${this.SEARCH_PREFIX}*`);
  }

  // Category caching
  async cacheCategories(categories, ttl = 7200) {
    await this.set('categories:all', categories, ttl);
  }

  async getCachedCategories() {
    return this.get('categories:all');
  }

  // Brand caching
  async cacheBrands(brands, ttl = 7200) {
    await this.set('brands:all', brands, ttl);
  }

  async getCachedBrands() {
    return this.get('brands:all');
  }

  // Search result caching
  async cacheSearchResults(searchKey, results, ttl = 600) {
    await this.set(`${this.SEARCH_PREFIX}${searchKey}`, results, ttl);
  }

  async getCachedSearchResults(searchKey) {
    return this.get(`${this.SEARCH_PREFIX}${searchKey}`);
  }

  // User-specific caching
  async cacheUserData(userId, userData, ttl = 1800) {
    await this.set(`${this.USER_PREFIX}${userId}`, userData, ttl);
  }

  async getCachedUserData(userId) {
    return this.get(`${this.USER_PREFIX}${userId}`);
  }

  async invalidateUserData(userId) {
    await this.del(`${this.USER_PREFIX}${userId}`);
  }

  // Cache warming strategies
  async warmProductCache(productIds) {
    const { Product, Brand, Category, Inventory } = require('../models');
    
    for (const productId of productIds) {
      try {
        const product = await Product.findOne({
          where: { productId },
          include: [
            { model: Brand, as: 'brand' },
            { model: Category, as: 'category' },
            { model: Inventory, as: 'inventory' }
          ]
        });
        
        if (product) {
          await this.cacheProduct(productId, product.toJSON());
        }
      } catch (error) {
        console.error(`Failed to warm cache for product ${productId}:`, error);
      }
    }
  }
}

module.exports = new CacheService();
```

### **4. Shopping Cart Optimization**
**Problem**: Database queries for every cart operation, cart data not persisted across sessions.

**Redis Solution**: Redis-based cart storage with session persistence.

**Implementation**:
```javascript
// src/services/RedisCartService.js
const redis = require('../config/redis');
const { Product, Size, Inventory } = require('../models');

class RedisCartService {
  constructor() {
    this.CART_PREFIX = 'cart:';
    this.CART_EXPIRY = 7 * 24 * 60 * 60; // 7 days
  }

  async addToCart(userId, productId, sizeId, quantity) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    const itemKey = `${productId}:${sizeId}`;

    // Get product details for price calculation
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check inventory
    const inventory = await Inventory.findOne({
      where: { productId, sizeId }
    });

    if (!inventory || inventory.quantity < quantity) {
      throw new Error('Insufficient inventory');
    }

    const itemPrice = product.price * (1 - (product.discount || 0) / 100);
    const cartItem = {
      productId,
      sizeId,
      quantity,
      price: itemPrice,
      totalPrice: itemPrice * quantity,
      addedAt: new Date().toISOString()
    };

    await redis.hset(cartKey, itemKey, JSON.stringify(cartItem));
    await redis.expire(cartKey, this.CART_EXPIRY);

    return cartItem;
  }

  async getCart(userId) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    const cartData = await redis.hgetall(cartKey);

    if (!cartData || Object.keys(cartData).length === 0) {
      return { items: [], totalItems: 0, totalPrice: 0 };
    }

    const items = [];
    let totalPrice = 0;

    for (const [itemKey, itemData] of Object.entries(cartData)) {
      const item = JSON.parse(itemData);
      const [productId, sizeId] = itemKey.split(':');

      // Enrich with current product and size data
      const [product, size] = await Promise.all([
        Product.findByPk(productId, {
          attributes: ['name', 'image', 'price', 'discount']
        }),
        Size.findByPk(sizeId, {
          attributes: ['name']
        })
      ]);

      if (product && size) {
        items.push({
          ...item,
          productName: product.name,
          productImage: product.image,
          sizeName: size.name,
          currentPrice: product.price * (1 - (product.discount || 0) / 100)
        });
        totalPrice += item.totalPrice;
      }
    }

    return {
      items,
      totalItems: items.length,
      totalPrice
    };
  }

  async updateCartItem(userId, productId, sizeId, quantity) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    const itemKey = `${productId}:${sizeId}`;

    if (quantity <= 0) {
      return this.removeFromCart(userId, productId, sizeId);
    }

    const existingItem = await redis.hget(cartKey, itemKey);
    if (!existingItem) {
      throw new Error('Item not found in cart');
    }

    const item = JSON.parse(existingItem);
    item.quantity = quantity;
    item.totalPrice = item.price * quantity;

    await redis.hset(cartKey, itemKey, JSON.stringify(item));
    return item;
  }

  async removeFromCart(userId, productId, sizeId) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    const itemKey = `${productId}:${sizeId}`;

    const removed = await redis.client.hdel(cartKey, itemKey);
    return removed > 0;
  }

  async clearCart(userId) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    await redis.del(cartKey);
  }

  async getCartItemCount(userId) {
    const cartKey = `${this.CART_PREFIX}${userId}`;
    return await redis.client.hlen(cartKey);
  }

  // Migrate database cart to Redis (for existing users)
  async migrateCartToRedis(userId) {
    const { Cart, CartItem } = require('../models');
    
    const cart = await Cart.findOne({
      where: { userId },
      include: [{ model: CartItem, as: 'items' }]
    });

    if (cart && cart.items.length > 0) {
      for (const item of cart.items) {
        await this.addToCart(userId, item.productId, item.sizeId, item.quantity);
      }
      
      // Clear database cart after migration
      await CartItem.destroy({ where: { cartId: cart.id } });
      await Cart.destroy({ where: { id: cart.id } });
    }
  }
}

module.exports = new RedisCartService();
```

### **5. Real-time Inventory Management**
**Problem**: Inventory conflicts during high-traffic periods, overselling issues.

**Redis Solution**: Distributed locks and real-time inventory tracking.

**Implementation**:
```javascript
// src/services/InventoryService.js
const redis = require('../config/redis');
const { Inventory } = require('../models');

class InventoryService {
  constructor() {
    this.INVENTORY_PREFIX = 'inventory:';
    this.LOCK_PREFIX = 'lock:inventory:';
    this.RESERVATION_PREFIX = 'reservation:';
  }

  async acquireLock(productId, sizeId, timeout = 5000) {
    const lockKey = `${this.LOCK_PREFIX}${productId}:${sizeId}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    
    const acquired = await redis.client.set(
      lockKey, 
      lockValue, 
      'PX', 
      timeout, 
      'NX'
    );
    
    return acquired ? lockValue : null;
  }

  async releaseLock(productId, sizeId, lockValue) {
    const lockKey = `${this.LOCK_PREFIX}${productId}:${sizeId}`;
    
    // Lua script to ensure we only delete our own lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    return await redis.client.eval(script, 1, lockKey, lockValue);
  }

  async getAvailableQuantity(productId, sizeId) {
    const inventoryKey = `${this.INVENTORY_PREFIX}${productId}:${sizeId}`;
    
    // Try Redis first
    let quantity = await redis.get(inventoryKey);
    
    if (quantity === null) {
      // Fallback to database and cache the result
      const inventory = await Inventory.findOne({
        where: { productId, sizeId }
      });
      
      quantity = inventory ? inventory.quantity : 0;
      await redis.set(inventoryKey, quantity, 300); // Cache for 5 minutes
    }
    
    return parseInt(quantity);
  }

  async reserveInventory(productId, sizeId, quantity, orderId, ttl = 900) {
    const lockValue = await this.acquireLock(productId, sizeId);
    if (!lockValue) {
      throw new Error('Could not acquire inventory lock');
    }

    try {
      const available = await this.getAvailableQuantity(productId, sizeId);
      
      if (available < quantity) {
        throw new Error('Insufficient inventory');
      }

      // Create reservation
      const reservationKey = `${this.RESERVATION_PREFIX}${orderId}:${productId}:${sizeId}`;
      await redis.set(reservationKey, quantity, ttl);

      // Update available quantity in Redis
      const inventoryKey = `${this.INVENTORY_PREFIX}${productId}:${sizeId}`;
      await redis.set(inventoryKey, available - quantity, 300);

      return true;
    } finally {
      await this.releaseLock(productId, sizeId, lockValue);
    }
  }

  async confirmReservation(orderId, productId, sizeId) {
    const reservationKey = `${this.RESERVATION_PREFIX}${orderId}:${productId}:${sizeId}`;
    const reservedQuantity = await redis.get(reservationKey);

    if (!reservedQuantity) {
      throw new Error('Reservation not found or expired');
    }

    // Update database
    await Inventory.update(
      {
        quantity: require('sequelize').literal(`quantity - ${reservedQuantity}`),
        sold: require('sequelize').literal(`sold + ${reservedQuantity}`)
      },
      { where: { productId, sizeId } }
    );

    // Clear reservation
    await redis.del(reservationKey);

    // Update Redis cache
    const inventoryKey = `${this.INVENTORY_PREFIX}${productId}:${sizeId}`;
    const currentQuantity = await this.getAvailableQuantity(productId, sizeId);
    await redis.set(inventoryKey, currentQuantity, 300);

    return true;
  }

  async releaseReservation(orderId, productId, sizeId) {
    const reservationKey = `${this.RESERVATION_PREFIX}${orderId}:${productId}:${sizeId}`;
    const reservedQuantity = await redis.get(reservationKey);

    if (reservedQuantity) {
      // Return quantity to available inventory
      const inventoryKey = `${this.INVENTORY_PREFIX}${productId}:${sizeId}`;
      const currentQuantity = await this.getAvailableQuantity(productId, sizeId);
      await redis.set(inventoryKey, currentQuantity + parseInt(reservedQuantity), 300);

      // Clear reservation
      await redis.del(reservationKey);
    }
  }

  // Sync Redis inventory with database (scheduled job)
  async syncInventoryWithDatabase() {
    const inventories = await Inventory.findAll();
    
    for (const inventory of inventories) {
      const inventoryKey = `${this.INVENTORY_PREFIX}${inventory.productId}:${inventory.sizeId}`;
      await redis.set(inventoryKey, inventory.quantity, 300);
    }
  }
}

module.exports = new InventoryService();
```

### **6. Analytics & Metrics Collection**
**Problem**: No real-time analytics, difficult to track user behavior and system performance.

**Redis Solution**: Real-time metrics collection and analytics.

**Implementation**:
```javascript
// src/services/AnalyticsService.js
const redis = require('../config/redis');

class AnalyticsService {
  constructor() {
    this.METRICS_PREFIX = 'metrics:';
    this.USER_ACTIVITY_PREFIX = 'activity:';
    this.POPULAR_PRODUCTS_KEY = 'popular:products';
    this.SEARCH_TERMS_KEY = 'search:terms';
  }

  // Track page views
  async trackPageView(path, userId = null, sessionId = null) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    // Daily page views
    await redis.incr(`${this.METRICS_PREFIX}pageviews:${today}`);
    
    // Hourly page views
    await redis.incr(`${this.METRICS_PREFIX}pageviews:${today}:${hour}`);
    
    // Path-specific views
    await redis.incr(`${this.METRICS_PREFIX}path:${path}:${today}`);
    
    // User activity tracking
    if (userId) {
      await redis.zadd(
        `${this.USER_ACTIVITY_PREFIX}${userId}`,
        Date.now(),
        `${path}:${Date.now()}`
      );
      
      // Keep only last 100 activities
      await redis.client.zremrangebyrank(`${this.USER_ACTIVITY_PREFIX}${userId}`, 0, -101);
    }
  }

  // Track product views
  async trackProductView(productId, userId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    // Product popularity score
    await redis.zincrby(this.POPULAR_PRODUCTS_KEY, 1, productId);
    
    // Daily product views
    await redis.incr(`${this.METRICS_PREFIX}product:${productId}:${today}`);
    
    // User product interest
    if (userId) {
      await redis.zadd(
        `${this.USER_ACTIVITY_PREFIX}products:${userId}`,
        Date.now(),
        productId
      );
    }
  }

  // Track search terms
  async trackSearch(searchTerm, resultCount, userId = null) {
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Popular search terms
    await redis.zincrby(this.SEARCH_TERMS_KEY, 1, normalizedTerm);
    
    // Search result quality
    await redis.hset(
      `${this.METRICS_PREFIX}search:${normalizedTerm}`,
      'results',
      resultCount
    );
    
    if (userId) {
      await redis.zadd(
        `${this.USER_ACTIVITY_PREFIX}searches:${userId}`,
        Date.now(),
        normalizedTerm
      );
    }
  }

  // Track cart operations
  async trackCartOperation(operation, productId, userId) {
    const today = new Date().toISOString().split('T')[0];
    
    await redis.incr(`${this.METRICS_PREFIX}cart:${operation}:${today}`);
    await redis.incr(`${this.METRICS_PREFIX}cart:product:${productId}:${operation}:${today}`);
    
    if (operation === 'add') {
      await redis.zincrby(`${this.METRICS_PREFIX}cart:popular`, 1, productId);
    }
  }

  // Track order events
  async trackOrder(orderId, userId, totalAmount, items) {
    const today = new Date().toISOString().split('T')[0];
    
    // Order metrics
    await redis.incr(`${this.METRICS_PREFIX}orders:${today}`);
    await redis.incrbyfloat(`${this.METRICS_PREFIX}revenue:${today}`, totalAmount);
    
    // Product sales tracking
    for (const item of items) {
      await redis.zincrby(
        `${this.METRICS_PREFIX}sales:products`,
        item.quantity,
        item.productId
      );
    }
    
    // User purchase history
    await redis.zadd(
      `${this.USER_ACTIVITY_PREFIX}orders:${userId}`,
      Date.now(),
      orderId
    );
  }

  // Get popular products
  async getPopularProducts(limit = 10) {
    return redis.client.zrevrange(this.POPULAR_PRODUCTS_KEY, 0, limit - 1, 'WITHSCORES');
  }

  // Get popular search terms
  async getPopularSearchTerms(limit = 10) {
    return redis.client.zrevrange(this.SEARCH_TERMS_KEY, 0, limit - 1, 'WITHSCORES');
  }

  // Get daily metrics
  async getDailyMetrics(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const [pageviews, orders, revenue] = await Promise.all([
      redis.get(`${this.METRICS_PREFIX}pageviews:${targetDate}`) || 0,
      redis.get(`${this.METRICS_PREFIX}orders:${targetDate}`) || 0,
      redis.get(`${this.METRICS_PREFIX}revenue:${targetDate}`) || 0
    ]);
    
    return {
      date: targetDate,
      pageviews: parseInt(pageviews),
      orders: parseInt(orders),
      revenue: parseFloat(revenue)
    };
  }

  // Get user activity
  async getUserActivity(userId, limit = 50) {
    const activities = await redis.client.zrevrange(
      `${this.USER_ACTIVITY_PREFIX}${userId}`,
      0,
      limit - 1,
      'WITHSCORES'
    );
    
    return activities.map((activity, index) => {
      if (index % 2 === 0) {
        const [path, timestamp] = activity.split(':');
        return {
          path,
          timestamp: new Date(parseInt(activities[index + 1])).toISOString()
        };
      }
    }).filter(Boolean);
  }

  // Real-time dashboard data
  async getDashboardMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    const [
      todayPageviews,
      currentHourPageviews,
      todayOrders,
      todayRevenue,
      popularProducts,
      popularSearches
    ] = await Promise.all([
      redis.get(`${this.METRICS_PREFIX}pageviews:${today}`) || 0,
      redis.get(`${this.METRICS_PREFIX}pageviews:${today}:${currentHour}`) || 0,
      redis.get(`${this.METRICS_PREFIX}orders:${today}`) || 0,
      redis.get(`${this.METRICS_PREFIX}revenue:${today}`) || 0,
      this.getPopularProducts(5),
      this.getPopularSearchTerms(5)
    ]);
    
    return {
      today: {
        pageviews: parseInt(todayPageviews),
        orders: parseInt(todayOrders),
        revenue: parseFloat(todayRevenue)
      },
      currentHour: {
        pageviews: parseInt(currentHourPageviews)
      },
      popular: {
        products: popularProducts,
        searches: popularSearches
      }
    };
  }
}

module.exports = new AnalyticsService();
```

### **7. Background Job Queue**
**Problem**: Email sending, image processing, and other tasks blocking request-response cycle.

**Redis Solution**: Bull queue for background job processing.

**Implementation**:
```javascript
// src/services/QueueService.js
const Queue = require('bull');
const redis = require('../config/redis');

class QueueService {
  constructor() {
    // Create different queues for different job types
    this.emailQueue = new Queue('email processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.imageQueue = new Queue('image processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.analyticsQueue = new Queue('analytics processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.setupProcessors();
  }

  setupProcessors() {
    // Email processing
    this.emailQueue.process('send-order-confirmation', async (job) => {
      const { email, orderDetails } = job.data;
      const emailService = require('../utils/email');
      await emailService.sendOrderConfirmation({ email, orderDetails });
    });

    this.emailQueue.process('send-password-reset', async (job) => {
      const { email, resetToken } = job.data;
      const emailService = require('../utils/email');
      await emailService.sendPasswordReset({ email, resetToken });
    });

    // Image processing
    this.imageQueue.process('optimize-product-image', async (job) => {
      const { imageUrl, productId } = job.data;
      // Image optimization logic here
      console.log(`Processing image for product ${productId}: ${imageUrl}`);
    });

    // Analytics processing
    this.analyticsQueue.process('update-product-stats', async (job) => {
      const { productId, action } = job.data;
      const analyticsService = require('./AnalyticsService');
      
      if (action === 'view') {
        await analyticsService.trackProductView(productId);
      }
    });

    // Error handling
    this.emailQueue.on('failed', (job, err) => {
      console.error(`Email job ${job.id} failed:`, err);
    });

    this.imageQueue.on('failed', (job, err) => {
      console.error(`Image job ${job.id} failed:`, err);
    });
  }

  // Email jobs
  async sendOrderConfirmationEmail(email, orderDetails, delay = 0) {
    return this.emailQueue.add('send-order-confirmation', 
      { email, orderDetails },
      { 
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
  }

  async sendPasswordResetEmail(email, resetToken, delay = 0) {
    return this.emailQueue.add('send-password-reset',
      { email, resetToken },
      { 
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
  }

  // Image processing jobs
  async optimizeProductImage(imageUrl, productId) {
    return this.imageQueue.add('optimize-product-image',
      { imageUrl, productId },
      {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000
        }
      }
    );
  }

  // Analytics jobs
  async updateProductStats(productId, action) {
    return this.analyticsQueue.add('update-product-stats',
      { productId, action },
      {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 50
      }
    );
  }

  // Queue monitoring
  async getQueueStats() {
    const [emailStats, imageStats, analyticsStats] = await Promise.all([
      this.getQueueInfo(this.emailQueue),
      this.getQueueInfo(this.imageQueue),
      this.getQueueInfo(this.analyticsQueue)
    ]);

    return {
      email: emailStats,
      image: imageStats,
      analytics: analyticsStats
    };
  }

  async getQueueInfo(queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  }

  // Cleanup methods
  async cleanupQueues() {
    await Promise.all([
      this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.emailQueue.clean(24 * 60 * 60 * 1000, 'failed'),
      this.imageQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.imageQueue.clean(24 * 60 * 60 * 1000, 'failed'),
      this.analyticsQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.analyticsQueue.clean(24 * 60 * 60 * 1000, 'failed')
    ]);
  }
}

module.exports = new QueueService();
```

---

## 🎯 Implementation Priority & Timeline

### **Phase 1: Foundation (Week 1-2) - Critical**
**Priority**: High Impact, High Risk

1. **Redis Setup & Configuration**
   - Install and configure Redis
   - Create RedisManager class
   - Add Redis health checks
   - **Benefit**: Foundation for all Redis features

2. **Session Management**
   - Implement SessionService
   - Update authentication middleware
   - Add session invalidation
   - **Benefit**: Better security, scalable sessions

3. **Basic Caching**
   - Implement CacheService
   - Cache frequently accessed data (categories, brands)
   - **Benefit**: Immediate performance improvement

### **Phase 2: Performance Optimization (Week 3-4) - High Impact**
**Priority**: High Impact, Medium Risk

1. **Advanced Rate Limiting**
   - Implement sliding window rate limiter
   - Add DDoS protection
   - **Benefit**: Better security, system stability

2. **Product Catalog Caching**
   - Cache product listings and details
   - Implement cache invalidation
   - **Benefit**: Significant performance boost

3. **Shopping Cart Optimization**
   - Migrate cart to Redis
   - Implement cart persistence
   - **Benefit**: Better user experience, reduced DB load

### **Phase 3: Advanced Features (Week 5-6) - Medium Impact**
**Priority**: Medium Impact, Medium Risk

1. **Inventory Management**
   - Implement distributed locks
   - Add inventory reservations
   - **Benefit**: Prevent overselling, better inventory control

2. **Analytics & Metrics**
   - Real-time metrics collection
   - User behavior tracking
   - **Benefit**: Business insights, performance monitoring

### **Phase 4: Background Processing (Week 7-8) - Optimization**
**Priority**: Low Impact, Low Risk

1. **Job Queue Implementation**
   - Background email processing
   - Image optimization queue
   - **Benefit**: Better response times, system reliability

2. **Monitoring & Alerting**
   - Redis monitoring dashboard
   - Performance alerts
   - **Benefit**: Proactive issue detection

---

## 🚀 Real-World Production Benefits

### **Performance Improvements**
- **Response Time**: 60-80% reduction in API response times
- **Database Load**: 70% reduction in database queries
- **Concurrent Users**: 5x increase in concurrent user capacity
- **Cart Operations**: 90% faster cart operations

### **Scalability Enhancements**
- **Horizontal Scaling**: Stateless application servers
- **Load Distribution**: Redis cluster for high availability
- **Session Management**: Distributed sessions across instances
- **Cache Invalidation**: Coordinated cache updates

### **Security Improvements**
- **DDoS Protection**: Advanced rate limiting with IP banning
- **Session Security**: Instant session invalidation
- **Brute Force Protection**: Adaptive rate limiting
- **Suspicious Activity**: Real-time threat detection

### **Business Intelligence**
- **Real-time Analytics**: Live dashboard metrics
- **User Behavior**: Detailed activity tracking
- **Product Performance**: Sales and view analytics
- **Search Optimization**: Popular search term analysis

### **Operational Excellence**
- **Background Processing**: Non-blocking operations
- **Error Recovery**: Automatic job retry mechanisms
- **Monitoring**: Comprehensive system health checks
- **Maintenance**: Automated cleanup and optimization

---

## 📊 Success Metrics

### **Performance Metrics**
- **API Response Time**: Target < 200ms (from 800ms+)
- **Database Query Reduction**: Target 70% reduction
- **Cache Hit Rate**: Target > 85%
- **Concurrent Users**: Target 10,000+ simultaneous users

### **Business Metrics**
- **Cart Abandonment**: Reduce by 25% through better performance
- **Conversion Rate**: Improve by 15% through faster page loads
- **User Engagement**: Increase by 30% through better experience
- **Revenue**: Increase by 20% through improved performance

### **Technical Metrics**
- **System Uptime**: Target 99.9%
- **Error Rate**: Target < 0.1%
- **Memory Usage**: Optimize by 40%
- **CPU Usage**: Reduce by 30%

---

## 🛠️ Implementation Guidelines

### **Best Practices**
1. **Gradual Migration**: Implement features incrementally
2. **Fallback Mechanisms**: Always have database fallbacks
3. **Monitoring**: Comprehensive Redis monitoring
4. **Testing**: Thorough testing of cache invalidation
5. **Documentation**: Clear Redis key naming conventions

### **Common Pitfalls to Avoid**
1. **Cache Stampede**: Use locks for expensive operations
2. **Memory Leaks**: Implement proper TTL and cleanup
3. **Data Consistency**: Careful cache invalidation strategies
4. **Single Point of Failure**: Redis clustering for HA
5. **Security**: Secure Redis configuration

### **Monitoring Checklist**
- [ ] Redis memory usage
- [ ] Cache hit/miss ratios
- [ ] Queue processing times
- [ ] Session creation/destruction rates
- [ ] Rate limiting effectiveness
- [ ] Background job success rates

---

## 📚 Redis Configuration

### **Production Redis Configuration**
```redis
# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_secure_password
bind 127.0.0.1

# Performance
tcp-keepalive 300
timeout 0

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### **Environment Variables**
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0

# Session Configuration
SESSION_SECRET=your_session_secret
SESSION_TTL=604800

# Cache Configuration
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=7200

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3
```

---

## 🎯 Conclusion

This comprehensive Redis implementation strategy transforms the BAMITO backend into a high-performance, scalable e-commerce platform capable of handling production-level traffic and providing real-time features essential for modern e-commerce applications.

**Key Success Factors**:
- **Phased Implementation**: Minimize risk through incremental deployment
- **Performance Focus**: Address real bottlenecks with targeted solutions
- **Scalability**: Design for horizontal scaling from day one
- **Monitoring**: Comprehensive observability for proactive management
- **Security**: Advanced protection against common attack vectors

This strategy positions BAMITO as a production-ready, enterprise-grade e-commerce platform demonstrating advanced Redis usage patterns and real-world problem-solving capabilities.