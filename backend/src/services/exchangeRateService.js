const ExchangeRate = require('../models/ExchangeRate');
const logger = require('../utils/logger');

class ExchangeRateService {
  /**
   * Get exchange rate between two currencies
   */
  static async getExchangeRate(fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return {
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: 1.0,
          source: 'same_currency',
        };
      }

      const rate = await ExchangeRate.findActive(fromCurrency, toCurrency);
      if (!rate) {
        throw {
          statusCode: 404,
          message: `Exchange rate not found for ${fromCurrency} to ${toCurrency}`,
          code: 'RATE_NOT_FOUND',
        };
      }

      return rate;
    } catch (error) {
      logger.error('Error getting exchange rate:', error);
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertAmount(amount, fromCurrency, toCurrency) {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = (amount * rate.rate).toFixed(2);
      return parseFloat(convertedAmount);
    } catch (error) {
      logger.error('Error converting amount:', error);
      throw error;
    }
  }

  /**
   * Get all active exchange rates
   */
  static async getAllRates() {
    try {
      const rates = await ExchangeRate.getAllActive();
      return rates;
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * Update exchange rate (admin)
   */
  static async updateRate(rateId, newRate) {
    try {
      const result = await ExchangeRate.update(rateId, newRate);
      logger.info(`Updated exchange rate ${rateId} to ${newRate}`);
      return result;
    } catch (error) {
      logger.error('Error updating exchange rate:', error);
      throw error;
    }
  }

  /**
   * Create new exchange rate (admin)
   */
  static async createRate(fromCurrency, toCurrency, rate) {
    try {
      // Deactivate existing rate
      const existing = await ExchangeRate.findActive(fromCurrency, toCurrency);
      if (existing) {
        await ExchangeRate.update(existing.id, rate);
      } else {
        const result = await ExchangeRate.create({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate,
          source: 'admin',
        });
        return result;
      }
    } catch (error) {
      logger.error('Error creating exchange rate:', error);
      throw error;
    }
  }
}

module.exports = ExchangeRateService;
