/**
 * Clear all products data
 */

const { pool } = require('./src/config/db');

async function clearProducts() {
  try {
    console.log('🗑️  Clearing products data...\n');
    
    // Delete in order (respect foreign keys)
    console.log('Deleting stock movements...');
    const stockResult = await pool.query('DELETE FROM stock_movements');
    console.log(`✅ Deleted ${stockResult.rowCount} stock movements`);
    
    console.log('Deleting variant options...');
    const optionsResult = await pool.query('DELETE FROM variant_options');
    console.log(`✅ Deleted ${optionsResult.rowCount} variant options`);
    
    console.log('Deleting variant groups...');
    const groupsResult = await pool.query('DELETE FROM variant_groups');
    console.log(`✅ Deleted ${groupsResult.rowCount} variant groups`);
    
    console.log('Deleting products...');
    const productsResult = await pool.query('DELETE FROM products');
    console.log(`✅ Deleted ${productsResult.rowCount} products`);
    
    console.log('\n🎉 All products data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Failed to clear products:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run
clearProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Process failed:', error);
    process.exit(1);
  });
