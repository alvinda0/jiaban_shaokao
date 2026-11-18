const { pool } = require('./src/config/db');

async function test() {
  try {
    // Get product with variants
    const result = await pool.query(`
      SELECT 
        vg.id as group_id, 
        vg.name as group_name, 
        vg.product_id, 
        p.name as product_name,
        vo.id as option_id, 
        vo.name as option_name, 
        vo.price_adjustment
      FROM variant_groups vg
      INNER JOIN variant_options vo ON vo.variant_group_id = vg.id
      INNER JOIN products p ON p.id = vg.product_id
      LIMIT 10
    `);
    
    console.log('=== Products with Variants ===');
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
