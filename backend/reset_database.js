const { Pool } = require('pg');
require('dotenv').config();

const run = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shaokao',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '123456',
  });

  const client = await pool.connect();

  try {
    console.log('Dropping all tables and types...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✓ Database reset complete');
  } catch (err) {
    console.error('Reset failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch(console.error);
