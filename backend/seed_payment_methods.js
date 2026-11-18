const { pool } = require('./src/config/db');

async function seedPaymentMethods() {
  const client = await pool.connect();
  
  try {
    console.log('🏦 Starting to seed payment methods...\n');

    // Get all stores
    const storesResult = await client.query('SELECT id, name FROM stores');
    const stores = storesResult.rows;

    if (stores.length === 0) {
      console.log('⚠️  No stores found. Please create a store first.');
      return;
    }

    const paymentMethods = [
      { code: 'cash', name: 'Cash', type: 'cash' },
      { code: 'qris', name: 'QRIS', type: 'qris' },
      { code: 'gofood', name: 'GoFood', type: 'ewallet' },
      { code: 'grabfood', name: 'GrabFood', type: 'ewallet' },
      { code: 'shopeefood', name: 'ShopeeFood', type: 'ewallet' },
      { code: 'gopay', name: 'GoPay', type: 'ewallet' },
      { code: 'ovo', name: 'OVO', type: 'ewallet' },
      { code: 'dana', name: 'DANA', type: 'ewallet' },
      { code: 'cc_mandiri', name: 'Kartu Kredit Mandiri', type: 'credit_card' },
      { code: 'cc_bca', name: 'Kartu Kredit BCA', type: 'credit_card' },
      { code: 'cc_bni', name: 'Kartu Kredit BNI', type: 'credit_card' },
      { code: 'debit_mandiri', name: 'Debit Mandiri', type: 'debit' },
      { code: 'debit_bca', name: 'Debit BCA', type: 'debit' },
      { code: 'debit_bni', name: 'Debit BNI', type: 'debit' },
    ];

    for (const store of stores) {
      console.log(`\n📍 Store: ${store.name}`);
      
      for (const method of paymentMethods) {
        // Check if exists
        const existing = await client.query(
          'SELECT id FROM payment_methods WHERE store_id = $1 AND code = $2',
          [store.id, method.code]
        );

        if (existing.rows.length > 0) {
          // Update existing
          await client.query(
            'UPDATE payment_methods SET name = $1, type = $2 WHERE id = $3',
            [method.name, method.type, existing.rows[0].id]
          );
          console.log(`   ✅ Updated: ${method.name}`);
        } else {
          // Insert new
          await client.query(
            `INSERT INTO payment_methods (store_id, code, name, type, is_active)
             VALUES ($1, $2, $3, $4, true)`,
            [store.id, method.code, method.name, method.type]
          );
          console.log(`   ➕ Created: ${method.name}`);
        }
      }
    }

    console.log('\n🎉 Successfully seeded payment methods!');
    
  } catch (error) {
    console.error('❌ Error seeding payment methods:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedPaymentMethods()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
