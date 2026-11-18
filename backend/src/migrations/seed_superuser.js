require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS } = process.env;

(async () => {
  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASS,
  });

  const client = await pool.connect();

  try {
    const rolesResult = await client.query("SELECT id FROM roles WHERE name = 'superuser' LIMIT 1");
    if (rolesResult.rows.length === 0) {
      console.error('Role superuser tidak ditemukan. Jalankan migrate dulu.');
      process.exit(1);
    }
    const role_id = rolesResult.rows[0].id;

    const email = 'superuser@shaokao.com';
    const password = await bcrypt.hash('superuser123', 10);

    await client.query(
      `INSERT INTO users (name, email, password, role_id)
       VALUES ('Superuser', $1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [email, password, role_id]
    );

    const userResult = await client.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    console.log('Superuser seeded:', userResult.rows[0]);
    console.log('Email   :', email);
    console.log('Password: superuser123');
  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);
