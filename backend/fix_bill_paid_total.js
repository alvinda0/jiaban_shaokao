require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shaokao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123456',
  max: 10,
});

async function fixBillPaidTotal() {
  try {
    console.log('🔧 Fixing bill paid_total and status...');

    // Update all bills' paid_total based on actual payments
    const result = await pool.query(`
      UPDATE order_bills 
      SET 
        paid_total = COALESCE((
          SELECT SUM(amount) 
          FROM payments 
          WHERE bill_id = order_bills.id 
          AND status = 'paid'
        ), 0),
        status = CASE 
          WHEN COALESCE((
            SELECT SUM(amount) 
            FROM payments 
            WHERE bill_id = order_bills.id 
            AND status = 'paid'
          ), 0) >= grand_total 
          THEN 'paid'::bill_status 
          ELSE 'unpaid'::bill_status 
        END,
        paid_at = CASE
          WHEN COALESCE((
            SELECT SUM(amount) 
            FROM payments 
            WHERE bill_id = order_bills.id 
            AND status = 'paid'
          ), 0) >= grand_total
          THEN COALESCE(paid_at, NOW())
          ELSE NULL
        END
      WHERE id IN (
        SELECT DISTINCT bill_id 
        FROM payments 
        WHERE bill_id IS NOT NULL
      )
    `);

    console.log(`✅ Updated ${result.rowCount} bills`);

    // Show results
    const bills = await pool.query(`
      SELECT 
        ob.id,
        ob.bill_number,
        ob.label,
        ob.grand_total,
        ob.paid_total,
        ob.status,
        ob.paid_at,
        o.order_number
      FROM order_bills ob
      LEFT JOIN orders o ON ob.order_id = o.id
      ORDER BY o.order_number, ob.bill_number
    `);

    console.log('\n📋 Bills status:');
    bills.rows.forEach(bill => {
      console.log(`  ${bill.order_number} - ${bill.label || 'Bill ' + bill.bill_number}:`);
      console.log(`    Grand Total: Rp ${parseFloat(bill.grand_total).toLocaleString('id-ID')}`);
      console.log(`    Paid Total:  Rp ${parseFloat(bill.paid_total).toLocaleString('id-ID')}`);
      console.log(`    Status: ${bill.status}`);
      console.log(`    Paid At: ${bill.paid_at || '-'}`);
      console.log('');
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

fixBillPaidTotal();
