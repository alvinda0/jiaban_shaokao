const { pool } = require('./src/config/db');

async function clearTaxRules() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Deleting tax_rules data...\n');

    // Delete tax rules
    const result = await client.query('DELETE FROM tax_rules');
    console.log(`✅ Deleted ${result.rowCount} tax rules`);
    
  } catch (error) {
    console.error('❌ Error clearing tax_rules:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearTaxRules()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
