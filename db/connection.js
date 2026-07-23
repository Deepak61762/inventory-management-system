console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);






const mysql = require('mysql2');
require('dotenv').config();

// A "pool" keeps several reusable DB connections ready,
// so multiple requests can hit the database at the same time
// without waiting on a single shared connection.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// .promise() lets us use async/await instead of callbacks
module.exports = pool.promise();
