const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    const sql = fs.readFileSync('./src/migrations/030_add_accepted_at_to_orders.sql', 'utf8');
    await connection.query(sql);
    console.log('✓ Migration 030_add_accepted_at_to_orders.sql success');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
