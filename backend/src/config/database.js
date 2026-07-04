const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
});

pool.on('connect', () => {
  logger.info('Database connection pool established');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('Database connection failed:', err);
  } else {
    logger.info('Database connection successful');
  }
});

module.exports = pool;
