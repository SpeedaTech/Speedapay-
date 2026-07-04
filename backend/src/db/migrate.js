const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const logger = require('../utils/logger');

const migrate = async () => {
  try {
    logger.info('Starting database migration...');

    const migrationPath = path.join(__dirname, '001_init_auth_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
