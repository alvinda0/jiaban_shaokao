const { pool } = require('../config/db');
const crypto = require('crypto');

const findByStore = async (store_id) => {
  const result = await pool.query(
    `SELECT * FROM tables WHERE store_id = $1 ORDER BY type, number`,
    [store_id]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM tables WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const findByToken = async (qr_token) => {
  const result = await pool.query(
    `SELECT t.*, s.name AS store_name
     FROM tables t
     JOIN stores s ON t.store_id = s.id
     WHERE t.qr_token = $1`,
    [qr_token]
  );
  return result.rows[0] || null;
};

const create = async ({ store_id, number, type, qr_url }) => {
  const qr_token = crypto.randomBytes(32).toString('hex');
  const result = await pool.query(
    'INSERT INTO tables (store_id, number, type, qr_token, qr_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [store_id, number, type || 'reguler', qr_token, qr_url || null]
  );
  return result.rows[0];
};

const update = async (id, { number, type, qr_url, is_active }) => {
  const result = await pool.query(
    'UPDATE tables SET number = $1, type = $2, qr_url = $3, is_active = $4 WHERE id = $5',
    [number, type, qr_url || null, is_active, id]
  );
  return result;
};

const regenerateToken = async (id) => {
  const qr_token = crypto.randomBytes(32).toString('hex');
  await pool.query('UPDATE tables SET qr_token = $1 WHERE id = $2', [qr_token, id]);
  return qr_token;
};

const remove = async (id) => {
  const result = await pool.query('DELETE FROM tables WHERE id = $1', [id]);
  return result;
};

module.exports = { findByStore, findById, findByToken, create, update, regenerateToken, remove };
