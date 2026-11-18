const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  console.log('\n📊 USERS:');
  const [users] = await connection.query('SELECT id, email, store_id FROM users');
  users.forEach(u => console.log(`  - ${u.email} store: ${u.store_id}`));

  console.log('\n📊 CATEGORIES:');
  const [cats] = await connection.query('SELECT COUNT(*) as count, store_id FROM categories GROUP BY store_id');
  cats.forEach(c => console.log(`  - Store ${c.store_id}: ${c.count} categories`));

  console.log('\n📊 CATEGORIES DETAIL:');
  const [all] = await connection.query('SELECT id, name, parent_id, store_id FROM categories LIMIT 10');
  all.forEach(c => console.log(`  - ${c.name} (${c.id}) parent: ${c.parent_id}, store: ${c.store_id}`));

  await connection.end();
}

check();
