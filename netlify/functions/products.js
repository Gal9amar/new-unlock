const { getDb } = require('./_lib/db');
const { json, preflight } = require('./_lib/http');
const { rowToProduct } = require('./_lib/row-to-product');

// Public: GET all products, ordered the same way the old Firestore query was
// (`orderBy('order')`) — mirrors functions/index.js's `products` export.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const db = getDb();
    const res = await db.execute('SELECT * FROM products ORDER BY sort_order');
    return json(200, res.rows.map(rowToProduct));
  } catch (e) {
    return json(500, { error: e.message });
  }
};
