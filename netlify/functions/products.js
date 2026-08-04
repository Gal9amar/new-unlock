const { getDb } = require('./_lib/db');
const { json, preflight } = require('./_lib/http');

function rowToProduct(r) {
  return {
    id: r.id,
    title: r.title,
    desc: r.description,
    image: r.image,
    price: r.price,
    discount_price: r.discount_price,
    price_from: !!r.price_from,
    brand: r.brand,
    category: r.category,
    status: r.status,
    tags: JSON.parse(r.tags_json || '[]'),
    phone: r.phone,
    whatsapp: r.whatsapp,
    note: r.note,
    including_vat: r.including_vat,
    order: r.sort_order,
  };
}

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
