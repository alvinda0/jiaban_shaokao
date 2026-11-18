require('dotenv').config();
const { Pool } = require('pg');
const OrderService = require('./src/services/order.service');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
});

// Make pool accessible globally
global.pool = pool;

async function testSplitBillPerItem() {
  try {
    console.log('🧪 Testing Split Bill Per Item...\n');
    
    // Create a test order with items
    // First, find a test order or create one
    const ordersQuery = `
      SELECT o.id, o.order_number, o.store_id, o.subtotal, o.discount_total, o.status
      FROM orders o
      WHERE o.order_type = 'dine_in'
      ORDER BY o.created_at DESC
      LIMIT 1
    `;
    
    const ordersResult = await pool.query(ordersQuery);
    
    if (ordersResult.rows.length === 0) {
      console.log('❌ No suitable test order found');
      return;
    }
    
    const order = ordersResult.rows[0];
    console.log('📋 Found test order:', order);
    
    // Get items in this order
    const itemsQuery = `
      SELECT id, product_name, qty, unit_price, line_total
      FROM order_items
      WHERE order_id = $1 AND status != 'void'
      LIMIT 5
    `;
    
    const itemsResult = await pool.query(itemsQuery, [order.id]);
    console.log(`📦 Found ${itemsResult.rows.length} items in order:\n`, itemsResult.rows);
    
    if (itemsResult.rows.length < 2) {
      console.log('❌ Order needs at least 2 items');
      return;
    }
    
    // Prepare split data (Per Item)
    const item1 = itemsResult.rows[0];
    const item2 = itemsResult.rows[1];
    
    const splits = [
      {
        label: 'Bill 1',
        items: [
          {
            order_detail_id: item1.id.toString(),
            quantity: item1.qty,
            unit_price: item1.unit_price
          }
        ]
      },
      {
        label: 'Bill 2',
        items: [
          {
            order_detail_id: item2.id.toString(),
            quantity: item2.qty,
            unit_price: item2.unit_price
          }
        ]
      }
    ];
    
    console.log('\n💳 Test split data:');
    console.log(JSON.stringify(splits, null, 2));
    
    // Call splitBill method
    const bills = await OrderService.splitBill(order.id, splits, 'item');
    
    console.log('\n✅ Split bills created:');
    console.log(JSON.stringify(bills, null, 2));
    
    // Verify bills in database
    const billsQuery = `
      SELECT id, bill_number, subtotal, discount_total, service_charge_total, tax_total, grand_total
      FROM order_bills
      WHERE order_id = $1
      ORDER BY bill_number
    `;
    
    const billsDbResult = await pool.query(billsQuery, [order.id]);
    console.log('\n📊 Bills in database:');
    console.log(JSON.stringify(billsDbResult.rows, null, 2));
    
    // Verify bill items
    if (billsDbResult.rows.length > 0) {
      const billItemsQuery = `
        SELECT bill_id, order_item_id, qty, unit_price, line_total
        FROM order_bill_items
        WHERE bill_id IN (${billsDbResult.rows.map((_, i) => `$${i + 1}`).join(',')})
        ORDER BY bill_id
      `;
      
      const billItemsResult = await pool.query(billItemsQuery, billsDbResult.rows.map(b => b.id));
      console.log('\n📋 Bill items in database:');
      console.log(JSON.stringify(billItemsResult.rows, null, 2));
    }
    
    // Test check: Ensure no bill has 0 amount
    const zeroAmountBills = billsDbResult.rows.filter(b => b.grand_total === 0);
    if (zeroAmountBills.length > 0) {
      console.log('\n❌ ERROR: Found bills with 0 amount:');
      console.log(JSON.stringify(zeroAmountBills, null, 2));
    } else {
      console.log('\n✅ SUCCESS: All bills have non-zero amounts');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testSplitBillPerItem();
