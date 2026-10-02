const mysql = require('mysql2');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
};

// Hosted databases (Aiven) require TLS. Locally DB_SSL is unset, so this block is skipped.
if (process.env.DB_SSL === 'true') {
  config.ssl = {
    rejectUnauthorized: true,
    // The CA is stored in one env line with literal "\n"; turn those back into real newlines
    ca: process.env.DB_SSL_CA
      ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
      : undefined,
  };
}

const pool = mysql.createPool(config);

module.exports = pool.promise();