require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS || process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkAndAddSC() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking existing tax rules...\n');
    
    // Check existing tax rules
    const checkResult = await client.query(`
      SELECT id, store_id, code, name, rate, apply_dine_in, apply_take_away, is_active 
      FROM tax_rules 
      ORDER BY code
    `);
    
    console.log('📊 Current tax rules:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.code}: ${row.name} (${row.rate}%) - Dine In: ${row.apply_dine_in}, Take Away: ${row.apply_take_away}`);
    });
    
    // Check if SC exists
    const scExists = checkResult.rows.some(row => row.code === 'SC');
    
    if (!scExists) {
      console.log('\n❌ SC (Service Charge) not found!');
      console.log('➕ Adding SC to all stores...\n');
      
      // Get all stores
      const storesResult = await client.query('SELECT id, name FROM stores');
      
      for (const store of storesResult.rows) {
        const insertResult = await client.query(`
          INSERT INTO tax_rules (store_id, code, name, rate, apply_dine_in, apply_take_away, apply_delivery, include_sc_in_base, is_active)
          VALUES ($1, 'SC', 'Service Charge', 5.00, true, false, false, false, true)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [store.id]);
        
        if (insertResult.rows.length > 0) {
          console.log(`  ✅ Added SC to store: ${store.name} (${store.id})`);
        }
      }
      
      console.log('\n✅ SC added successfully!');
    } else {
      console.log('\n✅ SC already exists!');
    }
    
    // Show final tax rules
    console.log('\n📊 Final tax rules:');
    const finalResult = await client.query(`
      SELECT s.name as store_name, t.code, t.name, t.rate, t.apply_dine_in, t.apply_take_away, t.is_active 
      FROM tax_rules t
      JOIN stores s ON t.store_id = s.id
      ORDER BY s.name, t.code
    `);
    
    finalResult.rows.forEach(row => {
      console.log(`  - [${row.store_name}] ${row.code}: ${row.name} (${row.rate}%) - Dine In: ${row.apply_dine_in}, Take Away: ${row.apply_take_away}, Active: ${row.is_active}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndAddSC();
