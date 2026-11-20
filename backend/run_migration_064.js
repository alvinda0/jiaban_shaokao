const fs = require('fs');
const { pool } = require('./src/config/db');

async function runMigration() {
  try {
    console.log('🔄 Running migration: 064_add_bill_id_to_order_discounts.sql');
    
    const migrationSQL = fs.readFileSync('./src/migrations/064_add_bill_id_to_order_discounts.sql', 'utf-8');
    
    // Split by semicolon to handle multiple statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80) + '...');
      await pool.query(statement);
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
