require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function cleanAndRestore() {
  try {
    console.log('🗑️  Dropping all tables...');
    
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'shaokao';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASS || '123456';
    
    const connString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    
    // Drop schema dan recreate
    try {
      execSync(`psql "${connString}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, {
        env: { ...process.env, PGPASSWORD: password }
      });
      console.log('✅ All tables dropped');
    } catch (err) {
      console.log('⚠️  Drop error (might be OK):', err.message.split('\n')[0]);
    }
    
    // Restore dari dump
    console.log('\n🚀 Restoring from shaokaoo.sql...');
    
    const dumpPath = path.join(__dirname, 'src', 'migrations', 'shaokaoo.sql');
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`Dump file not found: ${dumpPath}`);
    }
    
    // Check if file is binary (custom format) or text
    const header = fs.readFileSync(dumpPath, { encoding: 'utf8', flag: 'r' }).substring(0, 50);
    
    if (header.includes('PGDMP')) {
      // Binary format - use pg_restore
      console.log('📦 Custom binary format detected - using pg_restore');
      execSync(`pg_restore -h ${host} -U ${user} -d ${database} -v "${dumpPath}"`, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: password }
      });
    } else {
      // Text format - use psql
      console.log('📄 Text SQL format detected - using psql');
      execSync(`psql "${connString}" -f "${dumpPath}"`, {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: password }
      });
    }
    
    console.log('✅ Restore completed');
    console.log('\n🎉 Database reset and restored successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanAndRestore();
