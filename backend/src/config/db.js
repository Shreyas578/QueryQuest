const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'queryquest',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

// Helper to mirror the mysql2 promise API for simpler migration
module.exports = {
  query: async (text, params) => {
    // Convert ? placeholders to $1, $2, etc.
    let index = 1;
    const pgText = text.replace(/\?/g, () => `$${index++}`);
    const res = await pool.query(pgText, params);
    return [res.rows, res.fields];
  },
  getConnection: async () => {
    const client = await pool.connect();
    return {
      query: async (text, params) => {
        let index = 1;
        const pgText = text.replace(/\?/g, () => `$${index++}`);
        const res = await client.query(pgText, params);
        return [res.rows, res.fields];
      },
      release: () => client.release(),
    };
  },
  pool,
};
