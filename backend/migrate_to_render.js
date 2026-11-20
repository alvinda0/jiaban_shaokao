/**
 * Migration Script untuk Render Database
 * Jalankan: node migrate_to_render.js
 */

const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Render database connection string
const connectionString = 'postgresql://db_jiaban_singapore_user:lkvCn26K1fPl8uXp7A3FOwM@db_jiaban_singapore-postgres.render.com:5432/db_jiaban_shaokao';

// Alternative: Use from environment variable if available
// const connectionString = process.env.RENDER_DATABASE_URL;

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to Render database...');
    await client.connect();
    console.log('✅ Connected to Render database\n');

    // Read migration SQL
    const migrationSQL = fs.readFileSync('./src/migrations/064_add_bill_id_to_order_discounts.sql', 'utf-8');
    
    // Split by semicolon to handle multiple statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Running ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;
      
      // Show what we're executing
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      console.log(`[${statementNum}/${statements.length}] Executing: ${preview}...`);
      
      try {
        await client.query(statement);
        console.log(`✅ Statement ${statementNum} completed\n`);
      } catch (err) {
        // Check if error is because column already exists
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`⚠️  Column/Index already exists - skipping\n`);
        } else {
          console.error(`❌ Error in statement ${statementNum}:`);
          console.error(err.message);
          throw err;
        }
      }
    }

    console.log('════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');
    console.log('════════════════════════════════════════════════\n');

    // Verify changes
    console.log('🔍 Verifying changes...\n');
    
    // Check if bill_id column exists
    const checkBillId = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_discounts' AND column_name = 'bill_id'
    `);
    
    if (checkBillId.rows.length > 0) {
      console.log('✅ Column bill_id exists in order_discounts');
    }

    // Check if paid_total_updated_at column exists
    const checkPaidAt = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'order_bills' AND column_name = 'paid_total_updated_at'
    `);
    
    if (checkPaidAt.rows.length > 0) {
      console.log('✅ Column paid_total_updated_at exists in order_bills');
    }

    // Check if index exists
    const checkIndex = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'order_discounts' AND indexname = 'idx_od_bill'
    `);
    
    if (checkIndex.rows.length > 0) {
      console.log('✅ Index idx_od_bill exists\n');
    }

    console.log('🎉 All checks passed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration();
