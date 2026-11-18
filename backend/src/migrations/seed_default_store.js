/**
 * Seed Default Store
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shaokao_db'
};

async function seedStore() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Create default store
    console.log('📄 Creating default store...');
    await connection.query(
      `INSERT INTO stores (name, address, phone) 
       VALUES ('Shaokao Main Store', 'Jakarta Pusat', '021-1234567')`
    );

    // Get the created store
    const [stores] = await connection.query(
      'SELECT * FROM stores ORDER BY created_at DESC LIMIT 1'
    );

    const store = stores[0];
    
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
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
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
