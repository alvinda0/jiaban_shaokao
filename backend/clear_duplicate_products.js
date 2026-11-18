const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearDuplicates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('\n🔍 Finding duplicate products...');
  
  // Find products named "Sate Kambing" 
  const [products] = await connection.query(
    `SELECT id, name, created_at FROM products WHERE name LIKE '%Sate Kambing%' ORDER BY created_at`
  );
  
  console.log(`Found ${products.length} products:`);
  products.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.id}) - ${p.created_at}`);
  });

  if (products.length > 1) {
    console.log('\n🗑️  Deleting stock movements for duplicate products...');
    
    // Delete stock movements for all found products
    for (const p of products) {
      await connection.query('DELETE FROM stock_movements WHERE product_id = ?', [p.id]);
      console.log(`  ✓ Deleted stock movements for ${p.id}`);
    }

    console.log('\n🗑️  Deleting duplicate products...');
    
    // Delete all products
    for (const p of products) {
      await connection.query('DELETE FROM products WHERE id = ?', [p.id]);
      console.log(`  ✓ Deleted product ${p.id}`);
    }

    console.log('\n✅ All duplicates cleaned!');
  } else {
    console.log('\nℹ️  No duplicates found or only 1 product exists.');
  }

  await connection.end();
}

clearDuplicates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
