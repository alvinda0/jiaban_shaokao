const pg = require('pg');

// Render PostgreSQL connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://db_jiaban_shaokao_user:rv9qnFfeYzMn2oO20cUCOz5nVJukehxc@dpg-dbv9ba56e07s73b5doo0-a.singapore-postgres.render.com/db_jiaban_shaokao';

const pool = new pg.Pool({
  connectionString: connectionString,
  ssl: true // Required for Render
});

async function updatePassword() {
  const client = await pool.connect();
  try {
    console.log('🔗 Connected to Render database...');
    
    // New correct hash for superuser123
    const newHash = '$2b$10$J2zlW.syp2EdlncMQ1a9zOK7VV.CMLfSWOvykbLzpDbBJmCFtDs7S';
    
    // Update password
    const updateResult = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, password',
      [newHash, 'superuser@shaokao.com']
    );
    
    console.log('\n✅ Password updated:');
    console.log(updateResult.rows[0]);
    
    // Verify by selecting the user
    const verifyResult = await client.query(
      'SELECT id, email, password, is_active FROM users WHERE email = $1',
      ['superuser@shaokao.com']
    );
    
    console.log('\n✅ Verification:');
    console.log(verifyResult.rows[0]);
    
    console.log('\n✨ Superuser password updated successfully!');
    console.log('Email: superuser@shaokao.com');
    console.log('Password: superuser123');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.release();
    await pool.end();
  }
}

updatePassword();
