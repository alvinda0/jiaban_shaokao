/**
 * Sales API Test Script
 * 
 * Test all sales report endpoints
 * Make sure server is running before executing this script
 * 
 * Usage: node test_sales_api.js
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Test credentials - ganti dengan credential yang valid
const TEST_USER = {
  email: 'owner@shaokao.com', // Ganti dengan email user yang valid
  password: 'password123',     // Ganti dengan password yang valid
};

const STORE_ID = 1; // Ganti dengan store_id yang valid

let authToken = null;

// Helper function untuk print hasil
function printResult(title, data) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
  console.log(JSON.stringify(data, null, 2));
}

// Helper function untuk print error
function printError(title, error) {
  console.error('\n' + '!'.repeat(80));
  console.error(title);
  console.error('!'.repeat(80));
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else {
    console.error(error.message);
  }
}

// 1. Login untuk mendapatkan token
async function login() {
  try {
    console.log('\n🔐 Step 1: Login...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login berhasil!');
      console.log('Token:', authToken.substring(0, 50) + '...');
      return true;
    } else {
      console.error('❌ Login gagal: Token tidak ditemukan');
      return false;
    }
  } catch (error) {
    printError('❌ Login Error', error);
    return false;
  }
}

// 2. Test: Get Sales Report
async function testSalesReport() {
  try {
    console.log('\n📊 Step 2: Get Sales Report...');
    
    // Test dengan tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/report`,
      {
        params: {
          date_from: today,
          date_to: today,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Sales Report - Hari Ini', response.data);
    
    // Print summary
    const summary = response.data.data.summary;
    console.log('\n📈 SUMMARY:');
    console.log(`   Total Orders: ${summary.total_orders}`);
    console.log(`   Total Subtotal: Rp ${summary.total_subtotal.toLocaleString('id-ID')}`);
    console.log(`   Total Diskon: Rp ${summary.total_discount.toLocaleString('id-ID')}`);
    console.log(`   Total SC: Rp ${summary.total_service_charge.toLocaleString('id-ID')}`);
    console.log(`   Total PB1: Rp ${summary.total_tax.toLocaleString('id-ID')}`);
    console.log(`   Grand Total: Rp ${summary.total_grand_total.toLocaleString('id-ID')}`);
    console.log(`   Avg Order: Rp ${summary.avg_order_value.toLocaleString('id-ID')}`);
    
    // Print products
    console.log('\n🍽️  PRODUCTS SOLD:');
    response.data.data.products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.product_name}: ${p.total_qty} pcs @ Rp ${p.unit_price.toLocaleString('id-ID')} = Rp ${p.subtotal.toLocaleString('id-ID')}`);
    });
    
    // Print discounts
    console.log('\n💰 DISCOUNTS:');
    response.data.data.discounts.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.discount_name} (${d.type}): Rp ${d.total_amount.toLocaleString('id-ID')} (${d.usage_count}x)`);
    });
    
    // Print payment methods
    console.log('\n💳 PAYMENT METHODS:');
    response.data.data.payment_methods.forEach((pm, i) => {
      console.log(`   ${i + 1}. ${pm.payment_method}: Rp ${pm.total_amount.toLocaleString('id-ID')} (${pm.transaction_count}x)`);
    });
    
    return true;
  } catch (error) {
    printError('❌ Sales Report Error', error);
    return false;
  }
}

// 3. Test: Get Sales Report with Time Filter
async function testSalesReportWithTime() {
  try {
    console.log('\n⏰ Step 3: Get Sales Report dengan Time Filter...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/report`,
      {
        params: {
          date_from: today,
          date_to: today,
          time_from: '08:00:00',
          time_to: '15:00:00',
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Sales Report - Shift Pagi (08:00-15:00)', response.data);
    return true;
  } catch (error) {
    printError('❌ Sales Report with Time Error', error);
    return false;
  }
}

// 4. Test: Get Sales by Payment Method
async function testSalesByPaymentMethod() {
  try {
    console.log('\n💳 Step 4: Get Sales by Payment Method...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/payment-methods`,
      {
        params: {
          date_from: today,
          date_to: today,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Sales by Payment Method', response.data);
    return true;
  } catch (error) {
    printError('❌ Sales by Payment Method Error', error);
    return false;
  }
}

// 5. Test: Get Top Products
async function testTopProducts() {
  try {
    console.log('\n🏆 Step 5: Get Top Selling Products...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/top-products`,
      {
        params: {
          date_from: today,
          date_to: today,
          limit: 10,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Top 10 Products', response.data);
    return true;
  } catch (error) {
    printError('❌ Top Products Error', error);
    return false;
  }
}

// 6. Test: Get Sales by Category
async function testSalesByCategory() {
  try {
    console.log('\n📦 Step 6: Get Sales by Category...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/by-category`,
      {
        params: {
          date_from: today,
          date_to: today,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Sales by Category', response.data);
    return true;
  } catch (error) {
    printError('❌ Sales by Category Error', error);
    return false;
  }
}

// 7. Test: Get Discount Breakdown
async function testDiscountBreakdown() {
  try {
    console.log('\n💰 Step 7: Get Discount Breakdown...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_URL}/stores/${STORE_ID}/sales/discounts`,
      {
        params: {
          date_from: today,
          date_to: today,
        },
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    printResult('✅ Discount Breakdown', response.data);
    return true;
  } catch (error) {
    printError('❌ Discount Breakdown Error', error);
    return false;
  }
}

// Main execution
async function runTests() {
  console.log('🚀 Starting Sales API Tests...');
  console.log('Base URL:', BASE_URL);
  console.log('Store ID:', STORE_ID);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Run all tests
  await testSalesReport();
  await testSalesReportWithTime();
  await testSalesByPaymentMethod();
  await testTopProducts();
  await testSalesByCategory();
  await testDiscountBreakdown();
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests completed!');
  console.log('='.repeat(80));
}

// Execute
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
