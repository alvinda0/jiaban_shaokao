const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT id, store_id, table_number, type, is_occupied, is_active 
      FROM tables 
      ORDER BY table_number 
      LIMIT 20
    `);
    
    console.log('\n📊 Tables in database:');
    console.log('Total:', result.rows.length);
    console.log('');
    
    if (result.rows.length === 0) {
      console.log('⚠️  No tables found in database!');
      console.log('💡 You need to create tables first via the API or directly in DB');
    } else {
      result.rows.forEach(row => {
        console.log(`  Table ${row.table_number}:`);
        console.log(`    - Type: ${row.type}`);
        console.log(`    - Store ID: ${row.store_id}`);
        console.log(`    - Occupied: ${row.is_occupied}`);
        console.log(`    - Active: ${row.is_active}`);
        console.log('');
      });
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkTables();
