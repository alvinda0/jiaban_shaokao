require('dotenv').config();
const { pool } = require('./src/config/db');

async function cleanMergeNotes() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning "From: INV-xxx" from order_items notes...');
    
    // Remove "From: INV-xxx" pattern from notes
    const result = await client.query(`
      UPDATE order_items
      SET notes = CASE
        -- If notes ONLY contains "From: INV-xxx", set to NULL
        WHEN notes ~ '^From: INV-[0-9]+-[0-9]+$' THEN NULL
        -- If notes contains "From: INV-xxx | other_text", remove the prefix
        WHEN notes ~ '^From: INV-[0-9]+-[0-9]+ \\| ' THEN regexp_replace(notes, '^From: INV-[0-9]+-[0-9]+ \\| ', '')
        -- If notes contains "other_text | From: INV-xxx", remove the suffix
        WHEN notes ~ ' \\| From: INV-[0-9]+-[0-9]+$' THEN regexp_replace(notes, ' \\| From: INV-[0-9]+-[0-9]+$', '')
        ELSE notes
      END
      WHERE notes LIKE '%From: INV-%'
      RETURNING id, product_name, notes
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Cleaned ${result.rows.length} items:`);
      result.rows.forEach(row => {
        console.log(`  - ${row.product_name}: ${row.notes || '(empty)'}`);
      });
    } else {
      console.log('✅ No items to clean');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanMergeNotes()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
