const { Op } = require('sequelize');

/**
 * @fileoverview A reusable class to build complex API queries (filtering, sorting,
 * pagination, field limiting) for Sequelize models from a URL query string.
 */
class APIFeatures {
  /**
   * @param {import('sequelize').ModelCtor} model The Sequelize model to query.
   * @param {object} queryString The query string from the request (req.query).
   */
  constructor(model, queryString) {
    this.model = model;
    this.queryString = queryString;
    this.queryOptions = {
        where: {},
        order: [],
        attributes: { exclude: [] }
    };
  }

  /**
   * Handles filtering. Converts query params like ?price[gte]=100 to Sequelize format.
   * Also excludes special params like 'page', 'sort', 'limit', 'fields'.
   * @returns {this} The APIFeatures instance for chaining.
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering for gte, gt, lte, lt
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `[Op.${match}]`);
    
    // In Sequelize, Op symbols must be actual symbols, not strings.
    // So we need to parse it and replace string keys with Op symbols.
    const whereClause = JSON.parse(queryStr, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            const opKey = Object.keys(value)[0];
            if (opKey.startsWith('[Op.')) {
                const opSymbol = Op[opKey.substring(4, opKey.length - 1)];
                return { [opSymbol]: value[opKey] };
            }
        }
        return value;
    });

    this.queryOptions.where = { ...this.queryOptions.where, ...whereClause };
    return this;
  }

  /**
   * Handles sorting. Converts ?sort=-price,name to Sequelize format.
   * @returns {this} The APIFeatures instance for chaining.
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').map(field => {
        if (field.startsWith('-')) {
          return [field.substring(1), 'DESC'];
        }
        return [field, 'ASC'];
      });
      this.queryOptions.order = sortBy;
    } else {
      // Default sort order
      this.queryOptions.order = [['createdAt', 'DESC']];
    }
    return this;
  }

  /**
   * Handles field limiting. Converts ?fields=name,price to Sequelize's `attributes` option.
   * @returns {this} The APIFeatures instance for chaining.
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',');
      this.queryOptions.attributes = fields;
    } else {
      // Exclude __v by default if you're coming from Mongoose/MongoDB
      // this.queryOptions.attributes = { exclude: ['__v'] };
    }
    return this;
  }

  /**
   * Handles pagination.
   * @returns {this} The APIFeatures instance for chaining.
   */
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const offset = (page - 1) * limit;

    this.queryOptions.limit = limit;
    this.queryOptions.offset = offset;
    return this;
  }

  /**
   * Executes the final query using findAndCountAll for efficient pagination.
   * @returns {Promise<{count: number, rows: Model[]}>} The result from the database.
   */
  async execute() {
      return this.model.findAndCountAll(this.queryOptions);
  }
}

module.exports = APIFeatures;
