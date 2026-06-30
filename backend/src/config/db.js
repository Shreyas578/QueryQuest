const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'queryquest',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: async (text, params) => {
    // The previous pg implementation converted ? to $1. 
    // Now we're natively using mysql2 which expects ? placeholders.
    // If the queries were using $1, they would need conversion, but the pg shim 
    // was converting ? to $1, meaning the original queries use ? placeholders.
    const [rows, fields] = await pool.query(text, params);
    return [rows, fields];
  },
  getConnection: async () => {
    const connection = await pool.getConnection();
    return {
      query: async (text, params) => {
        const [rows, fields] = await connection.query(text, params);
        return [rows, fields];
      },
      release: () => connection.release(),
    };
  },
  pool,
};
