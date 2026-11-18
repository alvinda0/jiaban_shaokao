/**
 * Seed Default Store for PostgreSQL
 */

const { pool } = require('./src/config/db');

async function seedStore() {
  try {
    console.log('📄 Creating default store...');
    
    const result = await pool.query(
      `INSERT INTO stores (name, address, phone) 
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['Shaokao Main Store', 'Jakarta Pusat', '021-1234567']
    );

    const store = result.rows[0];
    
    console.log('✅ Default store created:\n');
    console.log(`   ID: ${store.id}`);
    console.log(`   Name: ${store.name}`);
    console.log(`   Address: ${store.address}`);
    console.log(`   Phone: ${store.phone}`);
    
    console.log('\n🎉 Seed completed!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run seed
seedStore()
  .then(() => {
    console.log('\n✨ Seed process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed process failed:', error);
    process.exit(1);
  });
