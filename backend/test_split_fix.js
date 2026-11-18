require('dotenv').config();
const OrderService = require('./src/services/order.service');
const { pool } = require('./src/config/db');

async function testSplitFix() {
  try {
    console.log('🧪 Testing Split Bill Per Item Fix...\n');
    
    // Get the test order
    const orderResult = await pool.query(`
      SELECT id, order_number, store_id, subtotal, discount_total, status
      FROM orders
      WHERE order_number = 'INV-20261117-0001'
    `);
    
    if (orderResult.rows.length === 0) {
      console.log('❌ Order not found');
      return;
    }
    
    const order = orderResult.rows[0];
    console.log('📋 Test Order:', order);
    
    // Get order items
    const itemsResult = await pool.query(`
      SELECT id, product_name, qty, unit_price, line_total
      FROM order_items
      WHERE order_id = $1 AND status != 'void'
      LIMIT 2
    `, [order.id]);
    
    if (itemsResult.rows.length < 2) {
      console.log('❌ Order needs at least 2 items');
      return;
    }
    
    const item1 = itemsResult.rows[0];
    const item2 = itemsResult.rows[1];
    
    console.log('\n📦 Order Items:');
    console.log('  Item 1:', item1);
    console.log('  Item 2:', item2);
    
    // Prepare split data (simulating what the Flutter app sends after our fix)
    const splits = [
      {
        label: 'Bill 1',
        items: [
          {
            order_detail_id: item1.id.toString(),
            quantity: parseInt(item1.qty),
            unit_price: parseFloat(item1.unit_price)
          }
        ]
      },
      {
        label: 'Bill 2',
        items: [
          {
            order_detail_id: item2.id.toString(),
            quantity: parseInt(item2.qty),
            unit_price: parseFloat(item2.unit_price)
          }
        ]
      }
    ];
    
    console.log('\n💳 Split Request Data:');
    console.log(JSON.stringify(splits, null, 2));
    
    // Update order status to pending (required for split)
    await pool.query(`
      UPDATE orders 
      SET status = 'pending' 
      WHERE id = $1
    `, [order.id]);
    
    // Call splitBill
    console.log('\n⚙️ Calling OrderService.splitBill()...');
    const bills = await OrderService.splitBill(order.id, splits, 'item');
    
    console.log('\n✅ Split bills created successfully:');
    console.log(JSON.stringify(bills, null, 2));
    
    // Verify in database
    const billsResult = await pool.query(`
      SELECT id, bill_number, subtotal, discount_total, service_charge_total, tax_total, grand_total
      FROM order_bills
      WHERE order_id = $1
      ORDER BY bill_number
    `, [order.id]);
    
    console.log('\n📊 Bills in database:');
    console.table(billsResult.rows);
    
    // Verify bill items
    if (billsResult.rows.length > 0) {
      const billItemsResult = await pool.query(`
        SELECT bill_id, order_item_id, qty, amount
        FROM order_bill_items
        WHERE bill_id IN (${billsResult.rows.map((_, i) => `$${i + 1}`).join(',')})
        ORDER BY bill_id
      `, billsResult.rows.map(b => b.id));
      
      console.log('\n📋 Bill items in database:');
      console.table(billItemsResult.rows);
      
      // Verify totals
      console.log('\n✨ Verification:');
      let allValid = true;
      
      for (const bill of billsResult.rows) {
        if (bill.grand_total === 0 || bill.grand_total === null) {
          console.log(`❌ Bill ${bill.bill_number}: Grand total is 0!`);
          allValid = false;
        } else {
          console.log(`✅ Bill ${bill.bill_number}: Grand total = Rp ${bill.grand_total}`);
        }
      }
      
      if (allValid) {
        console.log('\n🎉 SUCCESS: All bills have correct amounts!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testSplitFix();
