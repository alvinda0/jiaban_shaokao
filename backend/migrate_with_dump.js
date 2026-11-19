require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function restoreDump() {
  try {
    console.log('🔗 Database Restore dari shaokaoo.sql');
    
    const dumpPath = path.join(__dirname, 'src', 'migrations', 'shaokaoo.sql');
    if (!fs.existsSync(dumpPath)) {
      throw new Error(`Dump file not found: ${dumpPath}`);
    }
    
    const stats = fs.statSync(dumpPath);
    console.log(`✅ Dump file loaded (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'shaokao';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASS || '123456';
    
    console.log(`\n🚀 Restoring dump ke database...`);
    console.log(`   Host: ${host}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${user}`);
    
    // Use pg_restore untuk custom format dump
    execSync(`pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -v "${dumpPath}"`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PGPASSWORD: password
      }
    });
    
    console.log('✅ Dump restored successfully');
    console.log('\n🎉 Database restore completed!');
    console.log('📊 Data dan tabel sudah di-restore dari shaokaoo.sql');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreDump();
