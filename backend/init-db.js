const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'queryquest',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  const client = new Client(config);

  console.log(`🚀 Connecting to PostgreSQL at ${config.host}:${config.port}...`);

  try {
    await client.connect();
    console.log('📡 Connected. Initializing schema...');
    
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    
    console.log('✅ Database schema initialized successfully!');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
  } finally {
    await client.end();
  }
}

initDB();
