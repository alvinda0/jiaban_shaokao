/**
 * Seed sample categories untuk testing
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

// Store ID yang sudah ada
const STORE_ID = '45560016-d46b-11f1-ba3e-88d7f639089f';

async function seedCategories() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    // Clear existing categories (children first, then parents)
    console.log('🗑️  Clearing existing categories...');
    await connection.query('DELETE FROM categories WHERE store_id = ? AND parent_id IS NOT NULL', [STORE_ID]);
    await connection.query('DELETE FROM categories WHERE store_id = ? AND parent_id IS NULL', [STORE_ID]);
    console.log('✅ Cleared\n');

    // Insert parent categories
    console.log('📦 Creating parent categories...');
    
    const [makanan] = await connection.query(
      `INSERT INTO categories (store_id, name, sort_order) VALUES (?, ?, ?)`,
      [STORE_ID, 'Makanan', 1]
    );
    console.log('  ✓ Makanan');

    const [minuman] = await connection.query(
      `INSERT INTO categories (store_id, name, sort_order) VALUES (?, ?, ?)`,
      [STORE_ID, 'Minuman', 2]
    );
    console.log('  ✓ Minuman');

    const [snack] = await connection.query(
      `INSERT INTO categories (store_id, name, sort_order) VALUES (?, ?, ?)`,
      [STORE_ID, 'Snack', 3]
    );
    console.log('  ✓ Snack\n');

    // Get inserted IDs
    const [[makananRow]] = await connection.query(
      'SELECT id FROM categories WHERE store_id = ? AND name = ?',
      [STORE_ID, 'Makanan']
    );
    const [[minumanRow]] = await connection.query(
      'SELECT id FROM categories WHERE store_id = ? AND name = ?',
      [STORE_ID, 'Minuman']
    );

    const makananId = makananRow.id;
    const minumanId = minumanRow.id;

    // Insert subcategories
    console.log('📦 Creating subcategories...');
    
    // Makanan subcategories
    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, makananId, 'Nasi', 1]
    );
    console.log('  ✓ Makanan > Nasi');

    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, makananId, 'Mie', 2]
    );
    console.log('  ✓ Makanan > Mie');

    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, makananId, 'Ayam', 3]
    );
    console.log('  ✓ Makanan > Ayam');

    // Minuman subcategories
    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, minumanId, 'Kopi', 1]
    );
    console.log('  ✓ Minuman > Kopi');

    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, minumanId, 'Teh', 2]
    );
    console.log('  ✓ Minuman > Teh');

    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, minumanId, 'Jus', 3]
    );
    console.log('  ✓ Minuman > Jus');

    await connection.query(
      `INSERT INTO categories (store_id, parent_id, name, sort_order) VALUES (?, ?, ?, ?)`,
      [STORE_ID, minumanId, 'Soft Drink', 4]
    );
    console.log('  ✓ Minuman > Soft Drink\n');

    // Show results
    const [results] = await connection.query(
      'SELECT * FROM categories WHERE store_id = ? ORDER BY parent_id, sort_order',
      [STORE_ID]
    );

    console.log(`✅ Created ${results.length} categories:`);
    results.forEach(cat => {
      if (cat.parent_id) {
        console.log(`  - ${cat.name} (subcategory)`);
      } else {
        console.log(`  - ${cat.name} (parent)`);
      }
    });

  } catch (error) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run
seedCategories()
  .then(() => {
    console.log('\n✨ Seed complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
