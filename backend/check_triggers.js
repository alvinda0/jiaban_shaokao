require('dotenv').config();
const { pool } = require('./src/config/db');

async function checkTriggers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking triggers on order_items table...\n');
    
    const result = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'order_items'
      ORDER BY trigger_name
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No triggers found on order_items table');
    } else {
      console.log(`Found ${result.rows.length} triggers:\n`);
      result.rows.forEach((trigger, index) => {
        console.log(`${index + 1}. ${trigger.trigger_name}`);
        console.log(`   Event: ${trigger.event_manipulation}`);
        console.log(`   Timing: ${trigger.action_timing}`);
        console.log(`   Action: ${trigger.action_statement}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkTriggers()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
