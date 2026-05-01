const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
  const dbName = process.env.DB_NAME || 'queryquest';
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log(`🚀 Connecting to MySQL (Target DB: ${dbName})...`);

  try {
    // Read schema
    let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // If we are on a managed service, we might already have a database name.
    // We should ensure the schema uses the provided DB name if it's different.
    // Or just rely on the fact that the connection might already be bound to a DB.
    
    await connection.query(schema);
    console.log('✅ Database schema initialized successfully!');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  } finally {
    await connection.end();
  }
}

initDB();
