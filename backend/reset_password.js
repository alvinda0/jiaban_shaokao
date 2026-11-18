/**
 * Reset User Password
 */

const { pool } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const email = 'alvinda@shaokao.com';
    const newPassword = '123456';
    
    console.log(`🔐 Resetting password for ${email}...`);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔒 Password hashed');
    
    // Update password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING email, name',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
    } else {
      console.log('✅ Password reset successful:');
      console.log(`   User: ${result.rows[0].name}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   New password: ${newPassword}`);
    }
    
    console.log('\n🎉 Done!');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run
resetPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Process failed:', error);
    process.exit(1);
  });
