/**
 * Test Category CRUD API
 * Run: node test_category_api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const STORE_ID = '45560016-d46b-11f1-ba3e-88d7f639089f';

// Login dulu untuk dapat token
let TOKEN = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superuser@shaokao.com',
      password: 'superuser123'
    });
    TOKEN = res.data.data.token;
    console.log('✅ Logged in\n');
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(config => {
  if (TOKEN) {
    config.headers.Authorization = `Bearer ${TOKEN}`;
  }
  return config;
});

async function test() {
  try {
    await login();

    // 1. GET all categories (flat)
    console.log('1️⃣  GET /stores/:storeId/categories');
    const res1 = await api.get(`/stores/${STORE_ID}/categories`);
    console.log(`   Status: ${res1.status}`);
    console.log(`   Categories: ${res1.data.data.length} items`);
    console.log(`   Sample:`, res1.data.data.slice(0, 2));
    console.log('');

    // 2. GET all categories (tree)
    console.log('2️⃣  GET /stores/:storeId/categories?tree=true');
    const res2 = await api.get(`/stores/${STORE_ID}/categories?tree=true`);
    console.log(`   Status: ${res2.status}`);
    console.log(`   Tree:`, JSON.stringify(res2.data.data, null, 2));
    console.log('');

    // 3. GET parent categories only
    console.log('3️⃣  GET /stores/:storeId/categories/parents');
    const res3 = await api.get(`/stores/${STORE_ID}/categories/parents`);
    console.log(`   Status: ${res3.status}`);
    console.log(`   Parents: ${res3.data.data.length} items`);
    res3.data.data.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.id})`);
    });
    console.log('');

    // Get first parent ID for next tests
    const parentId = res3.data.data[0]?.id;

    // 4. GET subcategories
    console.log(`4️⃣  GET /stores/:storeId/categories/${parentId}/subcategories`);
    const res4 = await api.get(`/stores/${STORE_ID}/categories/${parentId}/subcategories`);
    console.log(`   Status: ${res4.status}`);
    console.log(`   Subcategories: ${res4.data.data.length} items`);
    res4.data.data.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });
    console.log('');

    // 5. CREATE new parent category
    console.log('5️⃣  POST /stores/:storeId/categories (create parent)');
    const res5 = await api.post(`/stores/${STORE_ID}/categories`, {
      name: 'Dessert',
      sort_order: 10,
      is_active: 1
    });
    console.log(`   Status: ${res5.status}`);
    console.log(`   Created:`, res5.data.data);
    console.log('');
    const newParentId = res5.data.data.id;

    // 6. CREATE subcategory
    console.log('6️⃣  POST /stores/:storeId/categories (create subcategory)');
    const res6 = await api.post(`/stores/${STORE_ID}/categories`, {
      name: 'Es Krim',
      parent_id: newParentId,
      sort_order: 1,
      is_active: 1
    });
    console.log(`   Status: ${res6.status}`);
    console.log(`   Created:`, res6.data.data);
    console.log('');
    const newSubId = res6.data.data.id;

    // 7. GET single category
    console.log(`7️⃣  GET /stores/:storeId/categories/${newSubId}`);
    const res7 = await api.get(`/stores/${STORE_ID}/categories/${newSubId}`);
    console.log(`   Status: ${res7.status}`);
    console.log(`   Category:`, res7.data.data);
    console.log('');

    // 8. UPDATE category
    console.log(`8️⃣  PUT /stores/:storeId/categories/${newSubId}`);
    const res8 = await api.put(`/stores/${STORE_ID}/categories/${newSubId}`, {
      name: 'Es Krim Premium',
      sort_order: 1
    });
    console.log(`   Status: ${res8.status}`);
    console.log(`   Updated:`, res8.data.data);
    console.log('');

    // 9. DELETE subcategory
    console.log(`9️⃣  DELETE /stores/:storeId/categories/${newSubId}`);
    const res9 = await api.delete(`/stores/${STORE_ID}/categories/${newSubId}`);
    console.log(`   Status: ${res9.status}`);
    console.log(`   Message:`, res9.data.message);
    console.log('');

    // 10. DELETE parent category
    console.log(`🔟 DELETE /stores/:storeId/categories/${newParentId}`);
    const res10 = await api.delete(`/stores/${STORE_ID}/categories/${newParentId}`);
    console.log(`   Status: ${res10.status}`);
    console.log(`   Message:`, res10.data.message);
    console.log('');

    // 11. Test validation - duplicate name
    console.log('1️⃣1️⃣  Test validation: duplicate category name');
    try {
      await api.post(`/stores/${STORE_ID}/categories`, {
        name: 'Makanan', // Already exists
        sort_order: 1
      });
    } catch (err) {
      console.log(`   Status: ${err.response.status}`);
      console.log(`   Error: ${err.response.data.message}`);
    }
    console.log('');

    // 12. Test validation - delete category with children
    console.log('1️⃣2️⃣  Test validation: delete category with subcategories');
    try {
      // Try to delete "Makanan" which has subcategories
      await api.delete(`/stores/${STORE_ID}/categories/${parentId}`);
    } catch (err) {
      console.log(`   Status: ${err.response.status}`);
      console.log(`   Error: ${err.response.data.message}`);
    }
    console.log('');

    console.log('✅ All tests completed!');

  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

test();
