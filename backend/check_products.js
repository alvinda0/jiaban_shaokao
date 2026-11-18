require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
});

async function checkProducts() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking products...\n');

    // Check all products
    const allProducts = await client.query(`
      SELECT id, name, is_active, is_available, category_id
      FROM products 
      WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
      LIMIT 10
    `);
    
    console.log('📦 All products:', allProducts.rows.length);
    allProducts.rows.forEach(p => {
      console.log(`  - ${p.name}: is_active=${p.is_active}, is_available=${p.is_available}`);
    });

    // Check active AND available products
    const activeProducts = await client.query(`
      SELECT id, name, is_active, is_available
      FROM products 
      WHERE store_id = '2a217fd0-5140-4e31-b137-c486ef41757b'
        AND is_active = 1 
        AND is_available = 1
    `);
    
    console.log('\n✅ Active AND Available products:', activeProducts.rows.length);
    activeProducts.rows.forEach(p => {
      console.log(`  - ${p.name}`);
    });

    // Check data types
    console.log('\n📊 Data type check:');
    const sample = allProducts.rows[0];
    if (sample) {
      console.log(`  is_active: ${sample.is_active} (type: ${typeof sample.is_active})`);
      console.log(`  is_available: ${sample.is_available} (type: ${typeof sample.is_available})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProducts();
