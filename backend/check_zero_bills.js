require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

async function checkBills() {
  try {
    console.log('🔍 Checking split bills...\n');
    
    // Check all bills
    const result = await pool.query(`
      SELECT 
        ob.id,
        o.order_number,
        ob.bill_number,
        ob.subtotal,
        ob.discount_total,
        ob.service_charge_total,
        ob.tax_total,
        ob.grand_total,
        ob.split_method,
        COUNT(obi.id) as item_count
      FROM order_bills ob
      LEFT JOIN orders o ON ob.order_id = o.id
      LEFT JOIN order_bill_items obi ON ob.id = obi.bill_id
      GROUP BY ob.id, o.order_number, ob.bill_number
      ORDER BY ob.created_at DESC
      LIMIT 20
    `);
    
    console.log('📊 All split bills (last 20):\n');
    console.table(result.rows);
    
    // Check for 0 amount bills
    const zeroResult = await pool.query(`
      SELECT 
        ob.id,
        o.order_number,
        ob.bill_number,
        ob.grand_total,
        ob.split_method,
        COUNT(obi.id) as item_count
      FROM order_bills ob
      LEFT JOIN orders o ON ob.order_id = o.id
      LEFT JOIN order_bill_items obi ON ob.id = obi.bill_id
      WHERE ob.grand_total = 0 OR ob.grand_total IS NULL
      GROUP BY ob.id, o.order_number, ob.bill_number
    `);
    
    if (zeroResult.rows.length > 0) {
      console.log('\n❌ ISSUE: Bills with 0 or NULL amount:');
      console.table(zeroResult.rows);
    } else {
      console.log('\n✅ No bills with 0 amount found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBills();
