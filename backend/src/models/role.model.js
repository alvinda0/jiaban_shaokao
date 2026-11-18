const { pool } = require('../config/db');

const findByName = async (name) => {
  const result = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
  return result.rows[0] || null;
};

const findAll = async () => {
  const result = await pool.query('SELECT * FROM roles ORDER BY name');
  return result.rows;
};

module.exports = { findByName, findAll };
