/**
 * Test script untuk Variant API
 * 
 * Cara pakai:
 * 1. Pastikan server berjalan (npm start)
 * 2. Update TOKEN, STORE_ID, CATEGORY_ID di bawah
 * 3. Jalankan: node test_variant_api.js
 */

const API_URL = 'http://localhost:3001/api/v1';

// GANTI dengan data yang valid
const TOKEN = 'your-jwt-token-here';
const STORE_ID = 'your-store-id-here';
const CATEGORY_ID = 'your-category-id-here';

// Helper function untuk request
async function apiRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const result = await response.json();
  
  console.log(`\n${method} ${endpoint}`);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  return result;
}

async function testVariantAPI() {
  console.log('='.repeat(60));
  console.log('TESTING VARIANT API');
  console.log('='.repeat(60));

  try {
    // ===== TEST 1: Create product WITH variants =====
    console.log('\n\n===== TEST 1: CREATE PRODUCT WITH VARIANTS =====');
    const createProductResult = await apiRequest('POST', `/stores/${STORE_ID}/products`, {
      name: 'Ayam Goreng Krispy',
      price: 25000,
      category_id: CATEGORY_ID,
      description: 'Ayam goreng dengan berbagai pilihan',
      track_stock: 0,
      is_available: 1,
      variants: [
        {
          group: {
            name: 'Level Pedas',
            is_required: 1,
            min_select: 1,
            max_select: 1,
            sort_order: 0
          },
          options: [
            { name: 'Tidak Pedas', price_adjustment: 0, is_default: 1, sort_order: 0 },
            { name: 'Pedas', price_adjustment: 0, is_default: 0, sort_order: 1 },
            { name: 'Extra Pedas', price_adjustment: 2000, is_default: 0, sort_order: 2 }
          ]
        },
        {
          group: {
            name: 'Ukuran',
            is_required: 1,
            min_select: 1,
            max_select: 1,
            sort_order: 1
          },
          options: [
            { name: 'Regular', price_adjustment: 0, is_default: 1, sort_order: 0 },
            { name: 'Large (+2 potong)', price_adjustment: 15000, is_default: 0, sort_order: 1 }
          ]
        },
        {
          group: {
            name: 'Topping',
            is_required: 0,
            min_select: 0,
            max_select: 5,
            sort_order: 2
          },
          options: [
            { name: 'Keju', price_adjustment: 3000, sort_order: 0 },
            { name: 'Telur', price_adjustment: 2000, sort_order: 1 },
            { name: 'Sosis', price_adjustment: 5000, sort_order: 2 }
          ]
        }
      ]
    });

    if (!createProductResult.success) {
      console.error('❌ Failed to create product with variants');
      return;
    }

    const productId = createProductResult.data.id;
    console.log(`✅ Product created with ID: ${productId}`);

    // ===== TEST 2: Create product WITHOUT variants =====
    console.log('\n\n===== TEST 2: CREATE PRODUCT WITHOUT VARIANTS =====');
    await apiRequest('POST', `/stores/${STORE_ID}/products`, {
      name: 'Nasi Goreng Spesial',
      price: 20000,
      category_id: CATEGORY_ID,
      description: 'Nasi goreng tanpa varian'
    });

    console.log('✅ Product without variants created successfully');

    // ===== TEST 3: Add variant to existing product =====
    console.log('\n\n===== TEST 3: ADD VARIANT TO EXISTING PRODUCT =====');
    const addVariantResult = await apiRequest('POST', `/products/${productId}/variants`, {
      group: {
        name: 'Tambahan',
        is_required: 0,
        min_select: 0,
        max_select: 3,
        sort_order: 3
      },
      options: [
        { name: 'Nasi', price_adjustment: 5000, sort_order: 0 },
        { name: 'Extra Sambal', price_adjustment: 2000, sort_order: 1 }
      ]
    });

    const newGroupId = addVariantResult.data?.id;
    console.log(`✅ New variant group added with ID: ${newGroupId}`);

    // ===== TEST 4: Get product with variants =====
    console.log('\n\n===== TEST 4: GET PRODUCT WITH VARIANTS =====');
    await apiRequest('GET', `/stores/${STORE_ID}/products/${productId}`);

    // ===== TEST 5: Update variant group =====
    if (newGroupId) {
      console.log('\n\n===== TEST 5: UPDATE VARIANT GROUP =====');
      await apiRequest('PUT', `/variants/groups/${newGroupId}`, {
        name: 'Tambahan Ekstra',
        is_required: 0,
        min_select: 0,
        max_select: 5,
        sort_order: 3
      });
      console.log('✅ Variant group updated');
    }

    // ===== TEST 6: Add option to group =====
    if (newGroupId) {
      console.log('\n\n===== TEST 6: ADD OPTION TO GROUP =====');
      await apiRequest('POST', `/variants/groups/${newGroupId}/options`, {
        name: 'Kerupuk',
        price_adjustment: 3000,
        sort_order: 2
      });
      console.log('✅ Option added to group');
    }

    // ===== TEST 7: Get all variants =====
    console.log('\n\n===== TEST 7: GET ALL VARIANTS FOR PRODUCT =====');
    await apiRequest('GET', `/products/${productId}/variants`);

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testVariantAPI();
