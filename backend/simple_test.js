const axios = require('axios');

async function test() {
  // Login
  const login = await axios.post('http://localhost:3000/api/auth/login', {
    email: 'superuser@shaokao.com',
    password: 'superuser123'
  });
  
  console.log('Login response:', JSON.stringify(login.data, null, 2));
  const token = login.data.data.token;
  
  // Get categories
  try {
    const res = await axios.get(
      'http://localhost:3000/api/stores/45560016-d46b-11f1-ba3e-88d7f639089f/categories',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('\nCategories response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\nCategories error:', err.response?.data || err.message);
  }
}

test();
