const pool = require('../config/database');
const logger = require('../utils/logger');

class ExchangeRate {
  static async create(rateData) {
    const query = `
      INSERT INTO exchange_rates (
        from_currency, to_currency, rate, source, active, effective_from
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, from_currency, to_currency, rate, source, active, effective_from
    `;
    try {
      const result = await pool.query(query, [
        rateData.from_currency,
        rateData.to_currency,
        rateData.rate,
        rateData.source || 'admin',
        true,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating exchange rate:', error);
      throw error;
    }
  }

  static async findActive(fromCurrency, toCurrency) {
    const query = `
      SELECT id, from_currency, to_currency, rate, source, active, effective_from
      FROM exchange_rates
      WHERE from_currency = $1 AND to_currency = $2 AND active = TRUE
            AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY effective_from DESC
      LIMIT 1
    `;
    try {
      const result = await pool.query(query, [fromCurrency, toCurrency]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding exchange rate:', error);
      throw error;
    }
  }

  static async getAllActive() {
    const query = `
      SELECT id, from_currency, to_currency, rate, source, effective_from
      FROM exchange_rates
      WHERE active = TRUE AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY from_currency, to_currency, effective_from DESC
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching active exchange rates:', error);
      throw error;
    }
  }

  static async update(rateId, newRate) {
    const query = `
      UPDATE exchange_rates
      SET active = FALSE, effective_to = NOW()
      WHERE id = $1;
      
      INSERT INTO exchange_rates (
        from_currency, to_currency, rate, source, active, effective_from
      ) SELECT from_currency, to_currency, $2, source, TRUE, NOW()
      FROM exchange_rates WHERE id = $1
      RETURNING id, from_currency, to_currency, rate, effective_from
    `;
    try {
      const result = await pool.query(query, [rateId, newRate]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating exchange rate:', error);
      throw error;
    }
  }
}

module.exports = ExchangeRate;
