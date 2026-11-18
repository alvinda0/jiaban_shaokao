const jwt = require('jsonwebtoken');
require('dotenv').config();

// Paste your token here (dari login response atau localStorage)
const YOUR_TOKEN = 'YOUR_TOKEN_HERE';

try {
  const decoded = jwt.verify(YOUR_TOKEN, process.env.JWT_SECRET);
  console.log('✅ Token valid!');
  console.log('📋 Token content:', JSON.stringify(decoded, null, 2));
  console.log('\n🔍 Role field:', decoded.role);
  console.log('🔍 Role type:', typeof decoded.role);
} catch (error) {
  console.error('❌ Token error:', error.message);
}
