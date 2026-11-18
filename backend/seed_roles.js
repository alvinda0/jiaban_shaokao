require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });

  await conn.query(`
    INSERT INTO roles (name) VALUES
      ('superuser'), ('admin'), ('captain'), ('kitchen')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `);

  // Hapus role lama 'user' yang tidak dipakai
  await conn.query(`DELETE FROM roles WHERE name = 'user'`);

  const [rows] = await conn.query('SELECT id, name FROM roles ORDER BY name');
  console.log('Roles saat ini:');
  rows.forEach(r => console.log(` - [${r.id}] ${r.name}`));

  await conn.end();
  console.log('Done.');
})().catch(console.error);
