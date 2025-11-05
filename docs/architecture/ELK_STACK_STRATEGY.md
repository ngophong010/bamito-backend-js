# 🚀 BAMITO Backend - ELK Stack Implementation Strategy

## Overview
This document outlines a comprehensive ELK Stack (Elasticsearch, Logstash, Kibana) implementation strategy for the BAMITO badminton e-commerce backend to address real-world production challenges including centralized logging, monitoring, analytics, and observability.

## Current Architecture Analysis
- ✅ **Solid Foundation**: Express.js, PostgreSQL, Sequelize ORM
- ✅ **Error Handling**: Global error handler with console logging
- ✅ **Complex Operations**: Order processing, inventory management, payments
- ✅ **Multiple Services**: Authentication, email, file processing
- ⚠️ **Limited Observability**: Basic console logging only
- ⚠️ **No Centralized Logging**: Logs scattered across different services
- ⚠️ **No Performance Monitoring**: No insights into system performance
- ⚠️ **Difficult Debugging**: Hard to trace issues across services

---

## 🎯 ELK Stack Benefits for E-commerce

### **Why ELK Stack is Perfect for BAMITO**

| **Component** | **Purpose** | **E-commerce Benefits** |
|---------------|-------------|-------------------------|
| **Elasticsearch** | Search & Analytics Engine | Fast log search, real-time analytics, performance metrics |
| **Logstash** | Data Processing Pipeline | Log parsing, enrichment, filtering, multiple input sources |
| **Kibana** | Visualization & Dashboard | Real-time dashboards, alerting, business intelligence |

### **Production Benefits**
- **Centralized Logging**: All services log to one location
- **Real-time Monitoring**: Live system health and performance metrics
- **Advanced Analytics**: Customer behavior, sales trends, system performance
- **Proactive Alerting**: Detect issues before they impact customers
- **Compliance & Audit**: Complete audit trail for orders and transactions
- **Performance Optimization**: Identify bottlenecks and optimization opportunities

---

## 🏗️ ELK Stack Implementation Strategy

### **1. Elasticsearch Configuration**

**Implementation**:
```javascript
// src/config/elasticsearch.js
const { Client } = require('@elastic/elasticsearch');

class ElasticsearchManager {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      },
      requestTimeout: 30000,
      pingTimeout: 3000,
      maxRetries: 3
    });
    
    this.indices = {
      LOGS: 'bamito-logs',
      ORDERS: 'bamito-orders',
      USERS: 'bamito-users',
      PRODUCTS: 'bamito-products',
      ANALYTICS: 'bamito-analytics',
      ERRORS: 'bamito-errors',
      PERFORMANCE: 'bamito-performance'
    };
  }

  async connect() {
    try {
      await this.client.ping();
      console.log('✅ Elasticsearch connected successfully');
      await this.createIndices();
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async createIndices() {
    const indexConfigurations = {
      [this.indices.LOGS]: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
            userId: { type: 'keyword' },
            sessionId: { type: 'keyword' },
            requestId: { type: 'keyword' },
            method: { type: 'keyword' },
            url: { type: 'keyword' },
            statusCode: { type: 'integer' },
            responseTime: { type: 'integer' },
            userAgent: { type: 'text' },
            ip: { type: 'ip' },
            error: {
              properties: {
                name: { type: 'keyword' },
                message: { type: 'text' },
                stack: { type: 'text' }
              }
            }
          }
        },
        settings: {
          number_of_shards: 2,
          number_of_replicas: 1,
          'index.lifecycle.name': 'bamito-logs-policy',
          'index.lifecycle.rollover_alias': 'bamito-logs-active'
        }
      },

      [this.indices.ORDERS]: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            orderId: { type: 'keyword' },
            userId: { type: 'keyword' },
            status: { type: 'keyword' },
            totalPrice: { type: 'float' },
            paymentMethod: { type: 'keyword' },
            paymentStatus: { type: 'keyword' },
            items: {
              type: 'nested',
              properties: {
                productId: { type: 'keyword' },
                productName: { type: 'text' },
                quantity: { type: 'integer' },
                price: { type: 'float' },
                category: { type: 'keyword' },
                brand: { type: 'keyword' }
              }
            },
            deliveryAddress: {
              properties: {
                city: { type: 'keyword' },
                district: { type: 'keyword' },
                country: { type: 'keyword' }
              }
            },
            processingTime: { type: 'integer' },
            source: { type: 'keyword' }
          }
        }
      },

      [this.indices.ANALYTICS]: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            eventType: { type: 'keyword' },
            userId: { type: 'keyword' },
            sessionId: { type: 'keyword' },
            productId: { type: 'keyword' },
            categoryId: { type: 'keyword' },
            brandId: { type: 'keyword' },
            searchTerm: { type: 'text' },
            pageUrl: { type: 'keyword' },
            referrer: { type: 'keyword' },
            userAgent: { type: 'text' },
            ip: { type: 'ip' },
            location: { type: 'geo_point' },
            value: { type: 'float' },
            metadata: { type: 'object' }
          }
        }
      },

      [this.indices.PERFORMANCE]: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            service: { type: 'keyword' },
            operation: { type: 'keyword' },
            duration: { type: 'integer' },
            success: { type: 'boolean' },
            errorRate: { type: 'float' },
            throughput: { type: 'integer' },
            memoryUsage: { type: 'integer' },
            cpuUsage: { type: 'float' },
            dbConnections: { type: 'integer' },
            cacheHitRate: { type: 'float' }
          }
        }
      }
    };

    for (const [indexName, config] of Object.entries(indexConfigurations)) {
      try {
        const exists = await this.client.indices.exists({ index: indexName });
        if (!exists) {
          await this.client.indices.create({
            index: indexName,
            body: config
          });
          console.log(`✅ Created index: ${indexName}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create index ${indexName}:`, error);
      }
    }
  }

  async indexDocument(index, document) {
    try {
      await this.client.index({
        index,
        body: {
          ...document,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Failed to index document to ${index}:`, error);
    }
  }

  async search(index, query) {
    try {
      const response = await this.client.search({
        index,
        body: query
      });
      return response.body;
    } catch (error) {
      console.error(`Search failed for index ${index}:`, error);
      throw error;
    }
  }

  async bulkIndex(operations) {
    try {
      const response = await this.client.bulk({
        body: operations
      });
      
      if (response.body.errors) {
        console.error('Bulk indexing errors:', response.body.items);
      }
      
      return response.body;
    } catch (error) {
      console.error('Bulk indexing failed:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchManager();
```

### **2. Advanced Logging Service**

**Problem**: Basic console logging with no structure or centralization.

**ELK Solution**: Structured logging with automatic indexing to Elasticsearch.

**Implementation**:
```javascript
// src/services/LoggingService.js
const elasticsearch = require('../config/elasticsearch');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class LoggingService {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });

    this.requestContext = new Map();
  }

  // Generate unique request ID for tracing
  generateRequestId() {
    return uuidv4();
  }

  // Set request context for correlation
  setRequestContext(requestId, context) {
    this.requestContext.set(requestId, {
      ...context,
      startTime: Date.now()
    });
  }

  // Get request context
  getRequestContext(requestId) {
    return this.requestContext.get(requestId) || {};
  }

  // Clear request context
  clearRequestContext(requestId) {
    this.requestContext.delete(requestId);
  }

  // Enhanced logging methods
  async logInfo(message, meta = {}) {
    const logEntry = this.createLogEntry('info', message, meta);
    this.logger.info(message, meta);
    await this.indexToElasticsearch(logEntry);
  }

  async logError(message, error = null, meta = {}) {
    const logEntry = this.createLogEntry('error', message, {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    });
    
    this.logger.error(message, { error, ...meta });
    await this.indexToElasticsearch(logEntry);
  }

  async logWarning(message, meta = {}) {
    const logEntry = this.createLogEntry('warn', message, meta);
    this.logger.warn(message, meta);
    await this.indexToElasticsearch(logEntry);
  }

  async logDebug(message, meta = {}) {
    const logEntry = this.createLogEntry('debug', message, meta);
    this.logger.debug(message, meta);
    await this.indexToElasticsearch(logEntry);
  }

  // Business event logging
  async logOrderEvent(eventType, orderData, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: `order.${eventType}`,
      service: 'order-service',
      orderId: orderData.orderId,
      userId: orderData.userId,
      totalPrice: orderData.totalPrice,
      status: orderData.status,
      paymentMethod: orderData.payment,
      items: orderData.items || [],
      processingTime: meta.processingTime,
      ...meta
    };

    await elasticsearch.indexDocument(elasticsearch.indices.ORDERS, logEntry);
    await this.logInfo(`Order ${eventType}: ${orderData.orderId}`, logEntry);
  }

  async logUserEvent(eventType, userData, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType: `user.${eventType}`,
      service: 'user-service',
      userId: userData.userId,
      email: userData.email,
      action: eventType,
      ...meta
    };

    await elasticsearch.indexDocument(elasticsearch.indices.USERS, logEntry);
    await this.logInfo(`User ${eventType}: ${userData.userId}`, logEntry);
  }

  async logAnalyticsEvent(eventType, data, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId: data.userId,
      sessionId: data.sessionId,
      productId: data.productId,
      categoryId: data.categoryId,
      brandId: data.brandId,
      searchTerm: data.searchTerm,
      pageUrl: data.pageUrl,
      referrer: data.referrer,
      userAgent: data.userAgent,
      ip: data.ip,
      value: data.value,
      metadata: data.metadata || {},
      ...meta
    };

    await elasticsearch.indexDocument(elasticsearch.indices.ANALYTICS, logEntry);
  }

  async logPerformanceMetrics(service, operation, metrics) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service,
      operation,
      duration: metrics.duration,
      success: metrics.success,
      errorRate: metrics.errorRate,
      throughput: metrics.throughput,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      dbConnections: metrics.dbConnections,
      cacheHitRate: metrics.cacheHitRate
    };

    await elasticsearch.indexDocument(elasticsearch.indices.PERFORMANCE, logEntry);
  }

  // HTTP request logging
  async logHttpRequest(req, res, responseTime, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'http-server',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.sessionId,
      requestId: req.requestId,
      contentLength: res.get('Content-Length'),
      ...meta
    };

    await this.indexToElasticsearch(logEntry);
  }

  // Database query logging
  async logDatabaseQuery(query, duration, success, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      service: 'database',
      query: query.sql || query,
      duration,
      success,
      ...meta
    };

    await this.indexToElasticsearch(logEntry);
  }

  // Security event logging
  async logSecurityEvent(eventType, details, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service: 'security',
      eventType,
      ip: details.ip,
      userAgent: details.userAgent,
      userId: details.userId,
      action: details.action,
      success: details.success,
      reason: details.reason,
      ...meta
    };

    await this.indexToElasticsearch(logEntry);
    await this.logWarning(`Security event: ${eventType}`, logEntry);
  }

  // Private methods
  createLogEntry(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: meta.service || 'bamito-backend',
      requestId: meta.requestId,
      userId: meta.userId,
      sessionId: meta.sessionId,
      ...meta
    };
  }

  async indexToElasticsearch(logEntry) {
    try {
      await elasticsearch.indexDocument(elasticsearch.indices.LOGS, logEntry);
    } catch (error) {
      // Fallback to console if Elasticsearch is unavailable
      console.error('Failed to index log to Elasticsearch:', error);
    }
  }

  // Batch logging for high-volume events
  async batchLog(logEntries) {
    const operations = [];
    
    logEntries.forEach(entry => {
      operations.push(
        { index: { _index: elasticsearch.indices.LOGS } },
        entry
      );
    });

    try {
      await elasticsearch.bulkIndex(operations);
    } catch (error) {
      console.error('Batch logging failed:', error);
    }
  }
}

module.exports = new LoggingService();
```

### **3. Request Tracking Middleware**

**Problem**: No correlation between requests and logs across services.

**ELK Solution**: Request correlation with distributed tracing.

**Implementation**:
```javascript
// src/middleware/requestTracking.js
const loggingService = require('../services/LoggingService');
const { v4: uuidv4 } = require('uuid');

const requestTrackingMiddleware = (req, res, next) => {
  // Generate unique request ID
  req.requestId = req.get('X-Request-ID') || uuidv4();
  req.startTime = Date.now();

  // Set request context
  loggingService.setRequestContext(req.requestId, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    sessionId: req.sessionId
  });

  // Add request ID to response headers
  res.set('X-Request-ID', req.requestId);

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    // Log HTTP request
    loggingService.logHttpRequest(req, res, responseTime, {
      requestId: req.requestId,
      responseSize: JSON.stringify(data).length
    });

    // Clear request context
    loggingService.clearRequestContext(req.requestId);
    
    return originalJson.call(this, data);
  };

  // Handle response end for non-JSON responses
  res.on('finish', () => {
    if (!res.headersSent) return;
    
    const responseTime = Date.now() - req.startTime;
    loggingService.logHttpRequest(req, res, responseTime, {
      requestId: req.requestId
    });
    
    loggingService.clearRequestContext(req.requestId);
  });

  next();
};

module.exports = requestTrackingMiddleware;
```

### **4. Enhanced Error Handler with ELK Integration**

**Problem**: Basic error logging without context or analytics.

**ELK Solution**: Structured error logging with context and alerting.

**Implementation**:
```javascript
// src/middleware/enhancedErrorHandler.js
const loggingService = require('../services/LoggingService');
const AppError = require('../utils/AppError');

const enhancedErrorHandler = async (err, req, res, next) => {
  // Set default status code and status message
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Enhanced error logging with context
  const errorContext = {
    requestId: req.requestId,
    userId: req.user?.id,
    sessionId: req.sessionId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query,
    statusCode: err.statusCode,
    service: 'error-handler'
  };

  // Log error with full context
  await loggingService.logError(
    `${err.status.toUpperCase()}: ${err.message}`,
    err,
    errorContext
  );

  // Log security events for specific error types
  if (err.statusCode === 401 || err.statusCode === 403) {
    await loggingService.logSecurityEvent('unauthorized_access', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      action: `${req.method} ${req.originalUrl}`,
      success: false,
      reason: err.message
    });
  }

  // Handle specific error types
  if (process.env.NODE_ENV === 'production') {
    let error = { ...err, message: err.message };
    
    // Sequelize errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0].path;
      const message = `Duplicate field value entered for: ${field}. Please use another value.`;
      error = new AppError(message, 400);
    }
    
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again.', 401);
    }

    if (error.name === 'TokenExpiredError') {
      error = new AppError('Your session has expired. Please log in again.', 401);
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      error = new AppError(message, 400);
    }

    // Send appropriate response
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        requestId: req.requestId
      });
    }
    
    // Programming errors - don't leak details
    await loggingService.logError('PROGRAMMING_ERROR', err, {
      ...errorContext,
      severity: 'critical'
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
      requestId: req.requestId
    });

  } else {
    // Development - send detailed error info
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
      requestId: req.requestId
    });
  }
};

module.exports = enhancedErrorHandler;
```

### **5. Business Analytics Service**

**Problem**: No insights into business metrics and user behavior.

**ELK Solution**: Real-time business analytics with Elasticsearch aggregations.

**Implementation**:
```javascript
// src/services/BusinessAnalyticsService.js
const elasticsearch = require('../config/elasticsearch');
const loggingService = require('./LoggingService');

class BusinessAnalyticsService {
  constructor() {
    this.setupPeriodicReports();
  }

  // Order Analytics
  async getOrderAnalytics(timeRange = '24h') {
    const query = {
      size: 0,
      query: {
        bool: {
          must: [
            { range: { timestamp: { gte: `now-${timeRange}` } } }
          ]
        }
      },
      aggs: {
        total_orders: { value_count: { field: 'orderId' } },
        total_revenue: { sum: { field: 'totalPrice' } },
        avg_order_value: { avg: { field: 'totalPrice' } },
        orders_by_status: {
          terms: { field: 'status' }
        },
        orders_by_payment_method: {
          terms: { field: 'paymentMethod' }
        },
        orders_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: '1h'
          },
          aggs: {
            revenue: { sum: { field: 'totalPrice' } }
          }
        },
        top_products: {
          nested: { path: 'items' },
          aggs: {
            products: {
              terms: { field: 'items.productName', size: 10 },
              aggs: {
                total_quantity: { sum: { field: 'items.quantity' } },
                total_revenue: { sum: { field: 'items.price' } }
              }
            }
          }
        }
      }
    };

    try {
      const response = await elasticsearch.search(elasticsearch.indices.ORDERS, query);
      return this.formatOrderAnalytics(response.aggregations);
    } catch (error) {
      await loggingService.logError('Failed to get order analytics', error);
      throw error;
    }
  }

  // User Behavior Analytics
  async getUserBehaviorAnalytics(timeRange = '24h') {
    const query = {
      size: 0,
      query: {
        bool: {
          must: [
            { range: { timestamp: { gte: `now-${timeRange}` } } }
          ]
        }
      },
      aggs: {
        unique_users: { cardinality: { field: 'userId' } },
        unique_sessions: { cardinality: { field: 'sessionId' } },
        events_by_type: {
          terms: { field: 'eventType' }
        },
        top_search_terms: {
          filter: { term: { eventType: 'search' } },
          aggs: {
            terms: {
              terms: { field: 'searchTerm', size: 20 }
            }
          }
        },
        popular_products: {
          filter: { term: { eventType: 'product_view' } },
          aggs: {
            products: {
              terms: { field: 'productId', size: 10 }
            }
          }
        },
        user_journey: {
          terms: { field: 'userId', size: 100 },
          aggs: {
            events: {
              top_hits: {
                sort: [{ timestamp: { order: 'asc' } }],
                size: 50,
                _source: ['eventType', 'pageUrl', 'timestamp']
              }
            }
          }
        }
      }
    };

    try {
      const response = await elasticsearch.search(elasticsearch.indices.ANALYTICS, query);
      return this.formatUserBehaviorAnalytics(response.aggregations);
    } catch (error) {
      await loggingService.logError('Failed to get user behavior analytics', error);
      throw error;
    }
  }

  // Performance Analytics
  async getPerformanceAnalytics(timeRange = '1h') {
    const query = {
      size: 0,
      query: {
        bool: {
          must: [
            { range: { timestamp: { gte: `now-${timeRange}` } } }
          ]
        }
      },
      aggs: {
        avg_response_time: { avg: { field: 'responseTime' } },
        max_response_time: { max: { field: 'responseTime' } },
        error_rate: {
          bucket_script: {
            buckets_path: {
              errors: 'status_codes>4xx.doc_count',
              total: '_count'
            },
            script: 'params.errors / params.total * 100'
          }
        },
        status_codes: {
          range: {
            field: 'statusCode',
            ranges: [
              { key: '2xx', from: 200, to: 300 },
              { key: '4xx', from: 400, to: 500 },
              { key: '5xx', from: 500, to: 600 }
            ]
          }
        },
        slowest_endpoints: {
          terms: { field: 'url', size: 10 },
          aggs: {
            avg_response_time: { avg: { field: 'responseTime' } }
          }
        },
        requests_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: '5m'
          },
          aggs: {
            avg_response_time: { avg: { field: 'responseTime' } },
            error_count: {
              filter: { range: { statusCode: { gte: 400 } } }
            }
          }
        }
      }
    };

    try {
      const response = await elasticsearch.search(elasticsearch.indices.LOGS, query);
      return this.formatPerformanceAnalytics(response.aggregations);
    } catch (error) {
      await loggingService.logError('Failed to get performance analytics', error);
      throw error;
    }
  }

  // Error Analytics
  async getErrorAnalytics(timeRange = '24h') {
    const query = {
      size: 0,
      query: {
        bool: {
          must: [
            { term: { level: 'error' } },
            { range: { timestamp: { gte: `now-${timeRange}` } } }
          ]
        }
      },
      aggs: {
        total_errors: { value_count: { field: 'message' } },
        error_types: {
          terms: { field: 'error.name', size: 10 }
        },
        error_messages: {
          terms: { field: 'error.message.keyword', size: 20 }
        },
        errors_by_service: {
          terms: { field: 'service' }
        },
        errors_over_time: {
          date_histogram: {
            field: 'timestamp',
            calendar_interval: '1h'
          }
        },
        top_error_urls: {
          terms: { field: 'url', size: 10 }
        }
      }
    };

    try {
      const response = await elasticsearch.search(elasticsearch.indices.LOGS, query);
      return this.formatErrorAnalytics(response.aggregations);
    } catch (error) {
      await loggingService.logError('Failed to get error analytics', error);
      throw error;
    }
  }

  // Real-time Dashboard Data
  async getDashboardData() {
    const [orderAnalytics, userBehavior, performance, errors] = await Promise.all([
      this.getOrderAnalytics('1h'),
      this.getUserBehaviorAnalytics('1h'),
      this.getPerformanceAnalytics('1h'),
      this.getErrorAnalytics('1h')
    ]);

    return {
      timestamp: new Date().toISOString(),
      orders: orderAnalytics,
      users: userBehavior,
      performance,
      errors,
      health: {
        elasticsearch: await this.checkElasticsearchHealth(),
        api: performance.avgResponseTime < 1000 && performance.errorRate < 5
      }
    };
  }

  // Health Checks
  async checkElasticsearchHealth() {
    try {
      const health = await elasticsearch.client.cluster.health();
      return health.body.status === 'green' || health.body.status === 'yellow';
    } catch (error) {
      return false;
    }
  }

  // Alerting
  async checkAlerts() {
    const performance = await this.getPerformanceAnalytics('5m');
    const errors = await this.getErrorAnalytics('5m');
    
    const alerts = [];

    // High error rate alert
    if (performance.errorRate > 10) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate is ${performance.errorRate.toFixed(2)}%`,
        threshold: 10,
        current: performance.errorRate
      });
    }

    // Slow response time alert
    if (performance.avgResponseTime > 2000) {
      alerts.push({
        type: 'slow_response_time',
        severity: 'warning',
        message: `Average response time is ${performance.avgResponseTime}ms`,
        threshold: 2000,
        current: performance.avgResponseTime
      });
    }

    // High error count alert
    if (errors.totalErrors > 50) {
      alerts.push({
        type: 'high_error_count',
        severity: 'critical',
        message: `${errors.totalErrors} errors in the last 5 minutes`,
        threshold: 50,
        current: errors.totalErrors
      });
    }

    if (alerts.length > 0) {
      await loggingService.logWarning('System alerts triggered', { alerts });
    }

    return alerts;
  }

  // Periodic reporting
  setupPeriodicReports() {
    // Generate hourly reports
    setInterval(async () => {
      try {
        const alerts = await this.checkAlerts();
        if (alerts.length > 0) {
          // Send alerts to monitoring system or email
          console.log('🚨 Alerts:', alerts);
        }
      } catch (error) {
        console.error('Failed to check alerts:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Generate daily summary
    setInterval(async () => {
      try {
        const summary = await this.getDashboardData();
        await loggingService.logInfo('Daily system summary', summary);
      } catch (error) {
        console.error('Failed to generate daily summary:', error);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  // Format methods
  formatOrderAnalytics(aggs) {
    return {
      totalOrders: aggs.total_orders.value,
      totalRevenue: aggs.total_revenue.value,
      avgOrderValue: aggs.avg_order_value.value,
      ordersByStatus: aggs.orders_by_status.buckets,
      ordersByPaymentMethod: aggs.orders_by_payment_method.buckets,
      ordersOverTime: aggs.orders_over_time.buckets,
      topProducts: aggs.top_products.products.buckets
    };
  }

  formatUserBehaviorAnalytics(aggs) {
    return {
      uniqueUsers: aggs.unique_users.value,
      uniqueSessions: aggs.unique_sessions.value,
      eventsByType: aggs.events_by_type.buckets,
      topSearchTerms: aggs.top_search_terms.terms.buckets,
      popularProducts: aggs.popular_products.products.buckets
    };
  }

  formatPerformanceAnalytics(aggs) {
    return {
      avgResponseTime: aggs.avg_response_time.value,
      maxResponseTime: aggs.max_response_time.value,
      errorRate: aggs.error_rate?.value || 0,
      statusCodes: aggs.status_codes.buckets,
      slowestEndpoints: aggs.slowest_endpoints.buckets,
      requestsOverTime: aggs.requests_over_time.buckets
    };
  }

  formatErrorAnalytics(aggs) {
    return {
      totalErrors: aggs.total_errors.value,
      errorTypes: aggs.error_types.buckets,
      errorMessages: aggs.error_messages.buckets,
      errorsByService: aggs.errors_by_service.buckets,
      errorsOverTime: aggs.errors_over_time.buckets,
      topErrorUrls: aggs.top_error_urls.buckets
    };
  }
}

module.exports = new BusinessAnalyticsService();
```

### **6. Updated Order Service with ELK Integration**

**Problem**: No visibility into order processing performance and issues.

**ELK Solution**: Comprehensive order event logging and performance tracking.

**Implementation**:
```javascript
// src/services/OrderService.js (Enhanced with ELK)
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const { sequelize, Order, OrderItem, Product, Size, User } = require("../models");
const loggingService = require('./LoggingService');

class OrderService {
  async createOrder(data) {
    const startTime = Date.now();
    const { userId, payment, deliveryAddress, voucherId, cartItems } = data;
    
    // Log order creation attempt
    await loggingService.logInfo('Order creation started', {
      userId,
      itemCount: cartItems?.length,
      service: 'order-service'
    });

    if (!userId || !payment || !deliveryAddress || !cartItems || cartItems.length === 0) {
      await loggingService.logError('Order creation failed: Missing required parameters', null, {
        userId,
        missingFields: {
          userId: !userId,
          payment: !payment,
          deliveryAddress: !deliveryAddress,
          cartItems: !cartItems || cartItems.length === 0
        },
        service: 'order-service'
      });
      throw new Error("Missing required parameters!");
    }

    return sequelize.transaction(async (t) => {
      try {
        // Step 1: Fetch required data
        const productIds = cartItems.map((item) => item.productId);
        const sizeIds = cartItems.map((item) => item.sizeId);

        const [products, sizes, user] = await Promise.all([
          Product.findAll({ where: { id: { [Op.in]: productIds } }, transaction: t }),
          Size.findAll({ where: { id: { [Op.in]: sizeIds } }, transaction: t }),
          User.findByPk(userId, { transaction: t })
        ]);

        if (!user) {
          await loggingService.logError('Order creation failed: User not found', null, {
            userId,
            service: 'order-service'
          });
          throw new Error("User not found.");
        }

        // Step 2: Calculate total price and create order items data
        let totalPrice = 0;
        const orderItemsData = cartItems.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const size = sizes.find((s) => s.id === item.sizeId);
          
          if (!product || !size) {
            throw new Error(`Product or Size not found for item: ${item.productId}/${item.sizeId}`);
          }

          const itemPrice = product.price * (1 - (product.discount || 0) / 100);
          const itemTotalPrice = itemPrice * item.quantity;
          totalPrice += itemTotalPrice;

          return {
            productId: item.productId,
            sizeId: item.sizeId,
            quantity: item.quantity,
            price: itemPrice,
            productName: product.name,
            productImage: product.image || "",
            sizeName: size.name,
          };
        });

        // Step 3: Create the Order
        const order = await Order.create({
          orderId: uuidv4().slice(-10).toUpperCase(),
          userId,
          voucherId,
          totalPrice,
          payment,
          deliveryAddress,
          status: 1, // Pending
          paymentStatus: 'PENDING'
        }, { transaction: t });

        // Step 4: Create OrderItems
        await OrderItem.bulkCreate(
          orderItemsData.map((item) => ({ ...item, orderId: order.id })),
          { transaction: t }
        );

        // Step 5: Clear user's cart
        const { Cart, CartItem } = require('../models');
        const userCart = await Cart.findOne({ where: { userId }, transaction: t });
        if (userCart) {
          await CartItem.destroy({ where: { cartId: userCart.id }, transaction: t });
        }

        const processingTime = Date.now() - startTime;

        // Log successful order creation
        await loggingService.logOrderEvent('created', {
          orderId: order.orderId,
          userId: order.userId,
          totalPrice: order.totalPrice,
          status: order.status,
          payment: order.payment,
          items: orderItemsData.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price
          }))
        }, {
          processingTime,
          itemCount: orderItemsData.length,
          success: true
        });

        // Log analytics event
        await loggingService.logAnalyticsEvent('order_created', {
          userId: order.userId,
          orderId: order.orderId,
          value: order.totalPrice,
          metadata: {
            itemCount: orderItemsData.length,
            paymentMethod: order.payment,
            processingTime
          }
        });

        console.log(`✅ Order ${order.orderId} created successfully in ${processingTime}ms`);
        return order;

      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        await loggingService.logError('Order creation failed', error, {
          userId,
          processingTime,
          service: 'order-service',
          cartItemCount: cartItems?.length
        });

        console.error("Failed to create order:", error);
        throw new Error("Could not create the order. Please try again.");
      }
    });
  }

  async cancelOrder(orderId) {
    const startTime = Date.now();
    
    await loggingService.logInfo('Order cancellation started', {
      orderId,
      service: 'order-service'
    });

    return sequelize.transaction(async (t) => {
      try {
        const order = await Order.findByPk(orderId, {
          include: [{ model: OrderItem, as: "items" }],
          transaction: t,
        });

        if (!order) {
          await loggingService.logError('Order cancellation failed: Order not found', null, {
            orderId,
            service: 'order-service'
          });
          throw new Error("Order not found.");
        }

        if (order.status !== 1) {
          await loggingService.logError('Order cancellation failed: Invalid status', null, {
            orderId,
            currentStatus: order.status,
            service: 'order-service'
          });
          throw new Error("Only pending orders can be cancelled.");
        }

        // Update order status
        await order.update({ status: 0 }, { transaction: t });

        const processingTime = Date.now() - startTime;

        // Log successful cancellation
        await loggingService.logOrderEvent('cancelled', {
          orderId: order.orderId,
          userId: order.userId,
          totalPrice: order.totalPrice,
          status: 0,
          payment: order.payment,
          items: order.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity
          }))
        }, {
          processingTime,
          reason: 'User requested',
          success: true
        });

        console.log(`✅ Order ${order.orderId} cancelled successfully in ${processingTime}ms`);

      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        await loggingService.logError('Order cancellation failed', error, {
          orderId,
          processingTime,
          service: 'order-service'
        });

        throw error;
      }
    });
  }

  async updateOrderStatus(orderId, status) {
    const startTime = Date.now();
    
    try {
      const [affectedRows] = await Order.update({ status }, { where: { id: orderId } });
      
      if (affectedRows === 0) {
        await loggingService.logError('Order status update failed: Order not found', null, {
          orderId,
          newStatus: status,
          service: 'order-service'
        });
        throw new Error("Order not found.");
      }

      const processingTime = Date.now() - startTime;

      // Get updated order for logging
      const order = await Order.findByPk(orderId);
      
      await loggingService.logOrderEvent('status_updated', {
        orderId: order.orderId,
        userId: order.userId,
        totalPrice: order.totalPrice,
        status: status,
        payment: order.payment
      }, {
        processingTime,
        previousStatus: order.status,
        newStatus: status,
        success: true
      });

      return { id: orderId, status };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      await loggingService.logError('Order status update failed', error, {
        orderId,
        newStatus: status,
        processingTime,
        service: 'order-service'
      });

      throw error;
    }
  }

  // Other methods remain similar with added logging...
  async getOrderDetail(orderId) {
    const startTime = Date.now();
    
    try {
      const order = await Order.findByPk(orderId, {
        include: [
          { model: User, as: "user", attributes: ["userName", "phoneNumber"] },
          { model: OrderItem, as: "items", include: [
            { model: Size, as: "size", attributes: ["sizeId", "name"] },
            { model: Product, as: "product", attributes: ["productId", "image", "name", "price", "discount"] }
          ]}
        ],
      });

      if (!order) {
        await loggingService.logError('Order detail fetch failed: Order not found', null, {
          orderId,
          service: 'order-service'
        });
        throw new Error("Order not found.");
      }

      const processingTime = Date.now() - startTime;
      
      await loggingService.logInfo('Order detail fetched successfully', {
        orderId: order.orderId,
        processingTime,
        service: 'order-service'
      });

      return order;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      await loggingService.logError('Order detail fetch failed', error, {
        orderId,
        processingTime,
        service: 'order-service'
      });

      throw error;
    }
  }
}

module.exports = new OrderService();
```

### **7. Logstash Configuration**

**Implementation**:
```ruby
# /etc/logstash/conf.d/bamito-pipeline.conf
input {
  # File input for application logs
  file {
    path => "/var/log/bamito/*.log"
    start_position => "beginning"
    codec => "json"
    tags => ["bamito", "application"]
  }
  
  # Beats input for system metrics
  beats {
    port => 5044
    tags => ["system", "metrics"]
  }
  
  # HTTP input for direct log shipping
  http {
    port => 8080
    codec => "json"
    tags => ["bamito", "http"]
  }
  
  # Database logs
  jdbc {
    jdbc_driver_library => "/usr/share/logstash/postgresql.jar"
    jdbc_driver_class => "org.postgresql.Driver"
    jdbc_connection_string => "jdbc:postgresql://localhost:5432/bamito_dev"
    jdbc_user => "postgres"
    jdbc_password => "password"
    schedule => "*/5 * * * *"
    statement => "SELECT * FROM orders WHERE updated_at > :sql_last_value ORDER BY updated_at"
    use_column_value => true
    tracking_column => "updated_at"
    tracking_column_type => "timestamp"
    tags => ["database", "orders"]
  }
}

filter {
  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }
  
  # Add environment information
  mutate {
    add_field => { "environment" => "${ENVIRONMENT:development}" }
    add_field => { "application" => "bamito-backend" }
  }
  
  # Parse user agent
  if [userAgent] {
    useragent {
      source => "userAgent"
      target => "user_agent"
    }
  }
  
  # GeoIP lookup
  if [ip] {
    geoip {
      source => "ip"
      target => "geoip"
    }
  }
  
  # Parse error stack traces
  if [error][stack] {
    mutate {
      gsub => [ "[error][stack]", "\n", " | " ]
    }
  }
  
  # Enrich order events
  if [eventType] =~ /^order\./ {
    mutate {
      add_field => { "business_event" => "true" }
      add_field => { "event_category" => "order" }
    }
  }
  
  # Enrich user events
  if [eventType] =~ /^user\./ {
    mutate {
      add_field => { "business_event" => "true" }
      add_field => { "event_category" => "user" }
    }
  }
  
  # Performance metrics
  if [responseTime] {
    if [responseTime] > 2000 {
      mutate {
        add_field => { "performance_issue" => "slow_response" }
      }
    }
  }
  
  # Security events
  if [statusCode] >= 400 and [statusCode] < 500 {
    mutate {
      add_field => { "security_event" => "client_error" }
    }
  }
  
  if [statusCode] >= 500 {
    mutate {
      add_field => { "security_event" => "server_error" }
    }
  }
  
  # Remove sensitive data
  mutate {
    remove_field => [ "password", "token", "creditCard" ]
  }
}

output {
  # Main application logs
  if "bamito" in [tags] {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOST:localhost:9200}"]
      index => "bamito-logs-%{+YYYY.MM.dd}"
      template_name => "bamito-logs"
      template_pattern => "bamito-logs-*"
      template => "/etc/logstash/templates/bamito-logs.json"
    }
  }
  
  # Business events
  if [business_event] == "true" {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOST:localhost:9200}"]
      index => "bamito-business-events-%{+YYYY.MM.dd}"
    }
  }
  
  # Performance metrics
  if [responseTime] {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOST:localhost:9200}"]
      index => "bamito-performance-%{+YYYY.MM.dd}"
    }
  }
  
  # Error logs
  if [level] == "error" {
    elasticsearch {
      hosts => ["${ELASTICSEARCH_HOST:localhost:9200}"]
      index => "bamito-errors-%{+YYYY.MM.dd}"
    }
    
    # Send critical errors to alerting system
    if [severity] == "critical" {
      http {
        url => "${ALERT_WEBHOOK_URL}"
        http_method => "post"
        format => "json"
        mapping => {
          "alert_type" => "critical_error"
          "message" => "%{message}"
          "service" => "%{service}"
          "timestamp" => "%{@timestamp}"
        }
      }
    }
  }
  
  # Debug output
  if "${DEBUG:false}" == "true" {
    stdout { codec => rubydebug }
  }
}
```

---

## 🎯 Implementation Priority & Timeline

### **Phase 1: Foundation Setup (Week 1-2) - Critical**
**Priority**: High Impact, Medium Risk

1. **ELK Infrastructure**
   - Install Elasticsearch, Logstash, Kibana
   - Configure basic indices and mappings
   - Setup ElasticsearchManager class
   - **Benefit**: Foundation for all logging and analytics

2. **Basic Logging Service**
   - Implement LoggingService with structured logging
   - Add request tracking middleware
   - **Benefit**: Immediate visibility into application behavior

3. **Enhanced Error Handling**
   - Update error handler with ELK integration
   - Add error context and correlation
   - **Benefit**: Better error tracking and debugging

### **Phase 2: Business Intelligence (Week 3-4) - High Impact**
**Priority**: High Impact, Medium Risk

1. **Business Analytics Service**
   - Implement order analytics
   - Add user behavior tracking
   - Create performance monitoring
   - **Benefit**: Real-time business insights

2. **Dashboard Creation**
   - Build Kibana dashboards
   - Create visualizations for key metrics
   - **Benefit**: Visual monitoring and reporting

3. **Alerting System**
   - Setup automated alerts
   - Configure thresholds and notifications
   - **Benefit**: Proactive issue detection

### **Phase 3: Advanced Features (Week 5-6) - Medium Impact**
**Priority**: Medium Impact, Low Risk

1. **Advanced Analytics**
   - User journey analysis
   - Product recommendation insights
   - Sales forecasting
   - **Benefit**: Advanced business intelligence

2. **Performance Optimization**
   - Query optimization
   - Index lifecycle management
   - **Benefit**: Better system performance

### **Phase 4: Production Hardening (Week 7-8) - Polish**
**Priority**: Low Impact, Low Risk

1. **Security & Compliance**
   - Audit logging
   - Data retention policies
   - **Benefit**: Compliance and security

2. **Scaling & Optimization**
   - Cluster configuration
   - Performance tuning
   - **Benefit**: Production readiness

---

## 🚀 Real-World Production Benefits

### **Operational Excellence**
- **Centralized Logging**: All services log to one searchable location
- **Real-time Monitoring**: Live dashboards showing system health
- **Proactive Alerting**: Detect issues before customers are affected
- **Root Cause Analysis**: Trace issues across distributed services

### **Business Intelligence**
- **Sales Analytics**: Real-time revenue, order trends, product performance
- **Customer Insights**: User behavior, journey analysis, conversion funnels
- **Inventory Intelligence**: Stock levels, demand forecasting, reorder alerts
- **Marketing Analytics**: Campaign effectiveness, customer segmentation

### **Performance Optimization**
- **Response Time Monitoring**: Identify slow endpoints and optimize
- **Error Rate Tracking**: Monitor and reduce application errors
- **Resource Utilization**: Track CPU, memory, database performance
- **Capacity Planning**: Predict scaling needs based on usage patterns

### **Security & Compliance**
- **Security Event Monitoring**: Track unauthorized access attempts
- **Audit Trail**: Complete log of all business transactions
- **Compliance Reporting**: Generate reports for regulatory requirements
- **Fraud Detection**: Identify suspicious patterns and behaviors

---

## 📊 Success Metrics

### **Operational Metrics**
- **Mean Time to Detection (MTTD)**: Target < 5 minutes
- **Mean Time to Resolution (MTTR)**: Target < 30 minutes
- **System Uptime**: Target 99.9%
- **Log Search Performance**: Target < 2 seconds

### **Business Metrics**
- **Order Processing Visibility**: 100% order tracking
- **Customer Behavior Insights**: Track 20+ user actions
- **Revenue Analytics**: Real-time revenue reporting
- **Inventory Optimization**: Reduce stockouts by 50%

### **Performance Metrics**
- **Error Rate Reduction**: Target < 1%
- **Performance Issue Detection**: 90% faster identification
- **Capacity Planning Accuracy**: 95% prediction accuracy
- **Cost Optimization**: 30% reduction in infrastructure costs

---

## 🛠️ Implementation Guidelines

### **Best Practices**
1. **Index Management**: Use index lifecycle policies for data retention
2. **Query Optimization**: Design efficient queries and aggregations
3. **Security**: Secure Elasticsearch cluster with authentication
4. **Monitoring**: Monitor ELK stack health and performance
5. **Backup**: Regular snapshots of critical indices

### **Common Pitfalls to Avoid**
1. **Over-logging**: Don't log everything, focus on valuable data
2. **Large Documents**: Keep log documents reasonably sized
3. **Missing Mappings**: Define proper field mappings
4. **No Retention Policy**: Implement data lifecycle management
5. **Security Gaps**: Secure all ELK components

### **Monitoring Checklist**
- [ ] Elasticsearch cluster health
- [ ] Index sizes and growth rates
- [ ] Query performance and response times
- [ ] Logstash pipeline throughput
- [ ] Kibana dashboard performance
- [ ] Alert notification delivery

---

## 📚 ELK Stack Configuration

### **Elasticsearch Configuration**
```yaml
# elasticsearch.yml
cluster.name: bamito-cluster
node.name: bamito-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true

# Performance
indices.memory.index_buffer_size: 20%
thread_pool.write.queue_size: 1000
```

### **Kibana Configuration**
```yaml
# kibana.yml
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "password"

# Security
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "your-encryption-key"
```

### **Environment Variables**
```env
# ELK Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
KIBANA_URL=http://localhost:5601
LOGSTASH_HOST=localhost:5044

# Logging Configuration
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
LOG_MAX_SIZE=100mb

# Alerting Configuration
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
ALERT_EMAIL=admin@bamito.com
```

---

## 🎯 Conclusion

This comprehensive ELK Stack implementation strategy transforms the BAMITO backend into a fully observable, analytically-driven e-commerce platform. The combination of centralized logging, real-time monitoring, and advanced analytics provides unprecedented visibility into system performance and business operations.

**Key Success Factors**:
- **Complete Observability**: Every request, error, and business event tracked
- **Real-time Intelligence**: Live dashboards and automated alerting
- **Business Analytics**: Deep insights into customer behavior and sales patterns
- **Proactive Operations**: Detect and resolve issues before customer impact
- **Scalable Architecture**: Designed to grow with business needs

This strategy positions BAMITO as a data-driven, operationally excellent e-commerce platform capable of competing with enterprise-level solutions while maintaining the agility of a modern startup.