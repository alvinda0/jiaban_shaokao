require('dotenv').config();
const axios = require('axios');

async function testApiResponse() {
  try {
    console.log('🌐 Testing API /bills endpoint...\n');
    
    // Get an order ID first
    const ordersRes = await axios.get('http://localhost:3000/orders', {
      params: { store_id: '2a217fd0-5140-4e31-b137-c486ef41757b' }
    });
    
    if (!ordersRes.data.data || ordersRes.data.data.length === 0) {
      console.log('❌ No orders found');
      return;
    }
    
    const order = ordersRes.data.data[0];
    console.log('📋 Found order:', order.id);
    
    // Get bills for this order
    const billsRes = await axios.get(`http://localhost:3000/stores/${order.store_id}/orders/${order.id}/bills`);
    
    console.log('\n📦 API Response:');
    console.log(JSON.stringify(billsRes.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

testApiResponse();
