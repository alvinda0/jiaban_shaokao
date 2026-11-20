const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const STORE_ID = 'store_001'; // Adjust as needed

// Helper to format currency
const formatCurrency = (val) => {
  return typeof val === 'number' ? `Rp ${Math.round(val).toLocaleString('id-ID')}` : String(val);
};

async function testSplitBillPayment() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           TESTING SPLIT BILL PAYMENT WITH PROMO                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Step 1: Create an order
    console.log('📝 Step 1: Creating order...');
    const orderRes = await axios.post(`${API_BASE}/stores/${STORE_ID}/orders`, {
      order_type: 'dine_in',
      customer_name: 'Test Customer',
      items: [
        {
          product_id: 'prod_001',
          quantity: 2,
          notes: 'Test item 1'
        },
        {
          product_id: 'prod_002',
          quantity: 1,
          notes: 'Test item 2'
        }
      ]
    });

    const order = orderRes.data.order;
    const orderId = order.id;
    console.log(`✓ Order created: ${order.order_number}`);
    console.log(`  - Subtotal: ${formatCurrency(order.subtotal)}`);
    console.log(`  - Tax: ${formatCurrency(order.tax_total)}`);
    console.log(`  - SC: ${formatCurrency(order.service_charge_total)}`);
    console.log(`  - Grand Total: ${formatCurrency(order.grand_total)}`);

    // Step 2: Split bill by amount
    console.log('\n📊 Step 2: Splitting bill by amount...');
    const splitRes = await axios.post(
      `${API_BASE}/stores/${STORE_ID}/orders/${orderId}/split-bill`,
      {
        splits: [
          {
            label: 'Bill 1',
            amount: Math.round(order.grand_total * 0.5)
          },
          {
            label: 'Bill 2',
            amount: Math.round(order.grand_total * 0.5)
          }
        ]
      }
    );

    const bills = splitRes.data.bills;
    console.log(`✓ Split created: ${bills.length} bills`);
    bills.forEach((bill, idx) => {
      console.log(`  Bill ${idx + 1} (#${bill.bill_number}):`);
      console.log(`    - Subtotal: ${formatCurrency(bill.subtotal)}`);
      console.log(`    - Discount: ${formatCurrency(bill.discount_total)}`);
      console.log(`    - SC: ${formatCurrency(bill.service_charge_total)}`);
      console.log(`    - Tax: ${formatCurrency(bill.tax_total)}`);
      console.log(`    - Grand Total: ${formatCurrency(bill.grand_total)}`);
    });

    // Step 3: Get available vouchers
    console.log('\n🎟️  Step 3: Getting available vouchers...');
    const vouchersRes = await axios.get(`${API_BASE}/stores/${STORE_ID}/vouchers`);
    const vouchers = vouchersRes.data.vouchers || [];
    console.log(`✓ Found ${vouchers.length} vouchers`);
    
    let testVoucher = vouchers.find(v => v.is_active);
    if (!testVoucher) {
      console.log('⚠️  No active vouchers found, creating test voucher...');
      const voucherRes = await axios.post(`${API_BASE}/stores/${STORE_ID}/vouchers`, {
        code: 'TEST10',
        name: 'Test 10%',
        type: 'discount',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: new Date(),
        valid_until: new Date(Date.now() + 30*24*60*60*1000),
        is_active: true
      });
      testVoucher = voucherRes.data.voucher;
      console.log(`  ✓ Created: ${testVoucher.code} (${testVoucher.discount_value}% off)`);
    } else {
      console.log(`  ✓ Using: ${testVoucher.code}`);
    }

    // Step 4: Pay first bill with promo
    console.log(`\n💳 Step 4: Paying first bill (${bills[0].bill_number}) with promo...`);
    const bill1 = bills[0];
    
    const paymentRes = await axios.post(
      `${API_BASE}/stores/${STORE_ID}/orders/${orderId}/payments`,
      {
        bill_id: bill1.id,
        payment_method_id: 'cash',
        payment_method_type: 'cash',
        amount: bill1.grand_total,
        voucher_code: testVoucher.code,
        tendered_amount: bill1.grand_total + 50000
      }
    );

    const payment = paymentRes.data.payment;
    console.log(`✓ Payment recorded:`);
    console.log(`  - Amount Paid: ${formatCurrency(payment.amount)}`);
    console.log(`  - Method: ${payment.payment_method_type}`);
    console.log(`  - Bill ID: ${payment.bill_id}`);

    // Step 5: Check updated bill totals
    console.log('\n📋 Step 5: Checking updated bill totals...');
    const orderCheckRes = await axios.get(`${API_BASE}/stores/${STORE_ID}/orders/${orderId}`);
    const updatedOrder = orderCheckRes.data.order;
    const updatedBills = updatedOrder.bills || [];

    updatedBills.forEach((bill, idx) => {
      console.log(`  Bill ${idx + 1} (#${bill.bill_number}):`);
      console.log(`    - Subtotal: ${formatCurrency(bill.subtotal)} (isFinite: ${Number.isFinite(parseFloat(bill.subtotal))})`);
      console.log(`    - Discount: ${formatCurrency(bill.discount_total)} (isFinite: ${Number.isFinite(parseFloat(bill.discount_total))})`);
      console.log(`    - SC: ${formatCurrency(bill.service_charge_total)} (isFinite: ${Number.isFinite(parseFloat(bill.service_charge_total))})`);
      console.log(`    - Tax: ${formatCurrency(bill.tax_total)} (isFinite: ${Number.isFinite(parseFloat(bill.tax_total))})`);
      console.log(`    - Grand Total: ${formatCurrency(bill.grand_total)} (isFinite: ${Number.isFinite(parseFloat(bill.grand_total))})`);
      console.log(`    - Paid Total: ${formatCurrency(bill.paid_total)}`);
      
      // Check for NaN strings
      if (bill.subtotal === 'NaN' || bill.discount_total === 'NaN' || bill.service_charge_total === 'NaN' || bill.tax_total === 'NaN' || bill.grand_total === 'NaN') {
        console.log(`    ❌ NaN DETECTED IN BILL!`);
      }
    });

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Error: ${error.response.data?.message || error.response.data}`);
    } else {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}

testSplitBillPayment();
