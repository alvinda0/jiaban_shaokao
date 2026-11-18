require('dotenv').config();
const { pool } = require('./src/config/db');

async function testMergeQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing merge query for order 729f1d4c-262f-49eb-9e74-6c4feedf8754...\n');
    
    // Get order items with the same query used in getOrderItems
    const result = await client.query(`
      SELECT oi.id,
             oi.order_id,
             oi.product_name,
             oi.original_order_id,
             orig_order.order_number as original_order_number,
             oi.created_at
      FROM order_items oi
      LEFT JOIN orders orig_order ON oi.original_order_id = orig_order.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `, ['729f1d4c-262f-49eb-9e74-6c4feedf8754']);
    
    console.log(`Found ${result.rows.length} items:\n`);
    
    result.rows.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product_name}`);
      console.log(`   id: ${item.id}`);
      console.log(`   order_id: ${item.order_id}`);
      console.log(`   original_order_id: ${item.original_order_id}`);
      console.log(`   original_order_number: ${item.original_order_number}`);
      console.log(`   created_at: ${item.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testMergeQuery()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
