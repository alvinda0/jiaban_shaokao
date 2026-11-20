const { pool } = require('./src/config/db');

async function verifyMigration() {
  try {
    console.log('🔍 Verifying Migration 064...\n');

    // Check column bill_id in order_discounts
    console.log('📋 Checking order_discounts table:');
    const discountsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_discounts'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in order_discounts:');
    discountsResult.rows.forEach(col => {
      if (col.column_name === 'bill_id') {
        console.log(`  ✅ ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      } else {
        console.log(`     ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      }
    });

    // Check column paid_total_updated_at in order_bills
    console.log('\n📋 Checking order_bills table:');
    const billsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_bills'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in order_bills:');
    billsResult.rows.forEach(col => {
      if (col.column_name === 'paid_total_updated_at') {
        console.log(`  ✅ ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      } else {
        console.log(`     ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      }
    });

    // Check if index exists
    console.log('\n📋 Checking indexes:');
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'order_discounts' AND indexname = 'idx_od_bill'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('  ✅ Index idx_od_bill exists');
    } else {
      console.log('  ❌ Index idx_od_bill NOT found');
    }

    // Check if constraint exists
    console.log('\n📋 Checking constraints:');
    const constraintResult = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'order_discounts' AND constraint_name = 'fk_od_bill'
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('  ✅ Constraint fk_od_bill exists');
    } else {
      console.log('  ❌ Constraint fk_od_bill NOT found');
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('✅ Migration 064 verification complete!');
    console.log('════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigration();
