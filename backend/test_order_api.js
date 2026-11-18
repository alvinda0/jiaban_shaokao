const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test configuration
const config = {
  store_id: '', // Fill with your store_id
  table_id: '', // Fill with your table_id
  product_id: '', // Fill with your product_id
  payment_method_id: '', // Fill with your payment_method_id (cash)
  token: '', // Fill with your JWT token
};

// Test data
let orderId = null;
let itemId = null;
let discountId = null;

// Helper function to make requests
const request = async (method, url, data = null, useAuth = false) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (useAuth && config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      headers,
    });

    console.log(`✅ ${method.toUpperCase()} ${url}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ ${method.toUpperCase()} ${url}`);
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
};

// Test functions
const tests = {
  // 1. Create Order (Public)
  async createOrder() {
    console.log('\n========== TEST 1: Create Order ==========');
    const result = await request('POST', '/orders', {
      store_id: config.store_id,
      table_id: config.table_id,
      order_type: 'dine_in',
      customer_name: 'Test Customer',
      guest_count: 2,
      notes: 'Test order',
    });
    orderId = result.data.id;
    console.log('Order ID:', orderId);
  },

  // 2. Get Order Details
  async getOrderDetails() {
    console.log('\n========== TEST 2: Get Order Details ==========');
    await request('GET', `/orders/${orderId}/details`);
  },

  // 3. Add Item to Order (Public)
  async addOrderItem() {
    console.log('\n========== TEST 3: Add Item to Order ==========');
    const result = await request('POST', `/orders/${orderId}/items`, {
      store_id: config.store_id,
      product_id: config.product_id,
      qty: 2,
      notes: 'No onions',
    });
    itemId = result.data.id;
    console.log('Item ID:', itemId);
  },

  // 4. Update Order Item
  async updateOrderItem() {
    console.log('\n========== TEST 4: Update Order Item ==========');
    await request('PUT', `/orders/${orderId}/items/${itemId}`, {
      qty: 3,
      notes: 'Extra spicy',
    });
  },

  // 5. Apply Discount at Order Stage (Protected)
  async applyDiscountOrder() {
    console.log('\n========== TEST 5: Apply Discount (Order Stage) ==========');
    const result = await request(
      'POST',
      `/stores/${config.store_id}/orders/${orderId}/discounts`,
      {
        name: 'Member Discount',
        type: 'percentage',
        value: 10,
        applied_stage: 'order',
      },
      true
    );
    if (result.data && result.data.length > 0) {
      discountId = result.data[0].id;
    }
  },

  // 6. Get Updated Order (check tax calculation)
  async checkTaxCalculation() {
    console.log('\n========== TEST 6: Check Tax Calculation ==========');
    const result = await request('GET', `/orders/${orderId}/details`);
    console.log('\n--- Order Summary ---');
    console.log('Subtotal:', result.data.subtotal);
    console.log('Discount Total:', result.data.discount_total);
    console.log('Service Charge:', result.data.service_charge_total);
    console.log('Tax Total:', result.data.tax_total);
    console.log('Grand Total:', result.data.grand_total);
    console.log('\nTaxes:', result.data.taxes);
  },

  // 7. Apply Discount at Payment Stage (Protected)
  async applyDiscountPayment() {
    console.log('\n========== TEST 7: Apply Discount (Payment Stage) ==========');
    await request(
      'POST',
      `/stores/${config.store_id}/orders/${orderId}/discounts`,
      {
        name: 'Payment Promo',
        type: 'fixed',
        value: 5000,
        applied_stage: 'payment',
      },
      true
    );
  },

  // 8. Add Payment (Protected)
  async addPayment() {
    console.log('\n========== TEST 8: Add Payment ==========');
    // Get current order total
    const orderDetails = await request('GET', `/orders/${orderId}/details`);
    const grandTotal = orderDetails.data.grand_total;

    await request(
      'POST',
      `/stores/${config.store_id}/orders/${orderId}/payments`,
      {
        payment_method_id: config.payment_method_id,
        amount: grandTotal,
        tendered_amount: grandTotal + 50000,
        change_amount: 50000,
      },
      true
    );
  },

  // 9. Check Order Status
  async checkOrderStatus() {
    console.log('\n========== TEST 9: Check Order Status ==========');
    const result = await request('GET', `/orders/${orderId}`);
    console.log('Order Status:', result.data.status);
    console.log('Paid Total:', result.data.paid_total);
    console.log('Grand Total:', result.data.grand_total);
  },

  // 10. Create Second Order for Merge Test
  async createSecondOrder() {
    console.log('\n========== TEST 10: Create Second Order ==========');
    const result = await request('POST', '/orders', {
      store_id: config.store_id,
      table_id: config.table_id,
      order_type: 'dine_in',
      customer_name: 'Second Order',
    });
    console.log('Second Order ID:', result.data.id);
    return result.data.id;
  },

  // 11. Test Takeaway (No Service Charge)
  async testTakeaway() {
    console.log('\n========== TEST 11: Test Takeaway Order (No SC) ==========');
    const result = await request('POST', '/orders', {
      store_id: config.store_id,
      order_type: 'takeaway',
      customer_name: 'Takeaway Customer',
    });
    const takeawayOrderId = result.data.id;

    // Add item
    await request('POST', `/orders/${takeawayOrderId}/items`, {
      store_id: config.store_id,
      product_id: config.product_id,
      qty: 1,
    });

    // Check totals
    const details = await request('GET', `/orders/${takeawayOrderId}/details`);
    console.log('\n--- Takeaway Order Summary ---');
    console.log('Service Charge:', details.data.service_charge_total, '(should be 0)');
    console.log('Taxes:', details.data.taxes);
  },

  // 12. Test Complimentary Item (Protected)
  async testComplimentaryItem() {
    console.log('\n========== TEST 12: Test Complimentary Item ==========');
    const result = await request('POST', '/orders', {
      store_id: config.store_id,
      order_type: 'dine_in',
      customer_name: 'Comp Test',
    });
    const compOrderId = result.data.id;

    // Add item
    const itemResult = await request('POST', `/orders/${compOrderId}/items`, {
      store_id: config.store_id,
      product_id: config.product_id,
      qty: 1,
    });
    const compItemId = itemResult.data.id;

    // Set as complimentary
    await request(
      'POST',
      `/stores/${config.store_id}/orders/${compOrderId}/items/${compItemId}/complimentary`,
      {
        is_complimentary: true,
        complimentary_reason: 'Birthday gift',
      },
      true
    );

    // Check order
    const details = await request('GET', `/orders/${compOrderId}/details`);
    console.log('Grand Total:', details.data.grand_total);
  },

  // 13. Test Split Bills (Protected)
  async testSplitBills() {
    console.log('\n========== TEST 13: Test Split Bills ==========');
    const result = await request('POST', '/orders', {
      store_id: config.store_id,
      order_type: 'dine_in',
      customer_name: 'Split Test',
    });
    const splitOrderId = result.data.id;

    // Add multiple items
    const item1 = await request('POST', `/orders/${splitOrderId}/items`, {
      store_id: config.store_id,
      product_id: config.product_id,
      qty: 2,
    });

    const item2 = await request('POST', `/orders/${splitOrderId}/items`, {
      store_id: config.store_id,
      product_id: config.product_id,
      qty: 1,
    });

    // Create split bills
    await request(
      'POST',
      `/stores/${config.store_id}/orders/${splitOrderId}/split-bills`,
      {
        bills: [
          {
            label: 'Bill 1',
            items: [
              {
                order_item_id: item1.data.id,
                qty: 2,
              },
            ],
          },
          {
            label: 'Bill 2',
            items: [
              {
                order_item_id: item2.data.id,
                qty: 1,
              },
            ],
          },
        ],
      },
      true
    );

    // Get bills
    await request('GET', `/orders/${splitOrderId}/bills`);
  },
};

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Order API Tests...\n');
  console.log('Configuration:', config);

  // Check configuration
  if (!config.store_id || !config.product_id || !config.payment_method_id) {
    console.error('\n❌ Please fill in the configuration at the top of the file:');
    console.error('- store_id');
    console.error('- product_id');
    console.error('- payment_method_id');
    console.error('- token (for protected routes)');
    return;
  }

  try {
    // Run tests sequentially
    await tests.createOrder();
    await tests.getOrderDetails();
    await tests.addOrderItem();
    await tests.updateOrderItem();
    await tests.applyDiscountOrder();
    await tests.checkTaxCalculation();
    await tests.applyDiscountPayment();
    await tests.addPayment();
    await tests.checkOrderStatus();
    
    // Additional tests
    await tests.testTakeaway();
    
    if (config.token) {
      await tests.testComplimentaryItem();
      await tests.testSplitBills();
    }

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run specific test
async function runTest(testName) {
  if (!tests[testName]) {
    console.error(`Test "${testName}" not found`);
    console.log('Available tests:', Object.keys(tests).join(', '));
    return;
  }

  try {
    await tests[testName]();
    console.log(`\n✅ Test "${testName}" completed`);
  } catch (error) {
    console.error(`\n❌ Test "${testName}" failed:`, error.message);
  }
}

// Command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  runTest(args[0]);
} else {
  runAllTests();
}
