require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function checkSchema() {
  try {
    console.log('🔍 Checking order_bill_items table schema...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_bill_items'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table structure:');
    console.table(result.rows);
    
    // Try to get any bill items
    console.log('\n📦 Sample bill items:');
    const itemsResult = await pool.query(`
      SELECT * FROM order_bill_items LIMIT 5
    `);
    
    if (itemsResult.rows.length === 0) {
      console.log('(No bill items in database)');
    } else {
      console.table(itemsResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
