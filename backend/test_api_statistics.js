require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const STORE_ID = '2a217fd0-5140-4e31-b137-c486ef41757b';

async function testAPI() {
  try {
    console.log('🔐 Logging in...\n');
    
    // Login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'alvinda@shaokao.com',
      password: '12345678' // Ganti dengan password yang benar
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful!\n');
    
    // Get statistics
    console.log('📊 Fetching today statistics...\n');
    const statsResponse = await axios.get(
      `${API_URL}/stores/${STORE_ID}/orders/statistics/today`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Response Status:', statsResponse.status);
    console.log('📦 Response Body:');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error Status:', error.response.status);
      console.error('❌ Error Response:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testAPI();
