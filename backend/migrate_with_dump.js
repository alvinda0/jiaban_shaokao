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
    
    const dumpContent = fs.readFileSync(dumpPath, 'utf-8');
    console.log(`✅ Dump file loaded (${(dumpContent.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Build connection string untuk psql
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const database = process.env.DB_NAME || 'shaokao';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASS || '123456';
    
    const connString = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    
    console.log(`\n🚀 Restoring dump ke database...`);
    console.log(`   Host: ${host}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${user}`);
    
    // Restore dump menggunakan psql
    const tempDumpFile = path.join(__dirname, '.temp_dump.sql');
    fs.writeFileSync(tempDumpFile, dumpContent);
    
    try {
      // Use PostgreSQL password file untuk avoid plaintext password
      const pgpassFile = path.join(process.env.HOME || process.env.USERPROFILE, '.pgpass');
      
      // Execute psql dengan dump file
      execSync(`psql "${connString}" -f "${tempDumpFile}"`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGPASSWORD: password
        }
      });
      
      console.log('✅ Dump restored successfully');
      
      // Cleanup temp file
      fs.unlinkSync(tempDumpFile);
      
      console.log('\n🎉 Database restore completed!');
      console.log('📊 Data dan tabel sudah di-restore dari shaokaoo.sql');
      
    } catch (err) {
      fs.unlinkSync(tempDumpFile);
      throw err;
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

restoreDump();
