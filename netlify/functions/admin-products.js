const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight, str } = require('./_lib/http');

function rowToProduct(r) {
  return {
    id: r.id, title: r.title, desc: r.description, image: r.image,
    price: r.price, discount_price: r.discount_price, price_from: !!r.price_from,
    brand: r.brand, category: r.category, status: r.status,
    tags: JSON.parse(r.tags_json || '[]'), phone: r.phone, whatsapp: r.whatsapp,
    note: r.note, including_vat: r.including_vat, order: r.sort_order,
  };
}

// Admin CRUD for products — mirrors functions/index.js's `adminProducts` export,
// including the "shift everyone's order +1, insert new at order 0" POST behavior.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  const db = getDb();

  try {
    if (event.httpMethod === 'GET') {
      const res = await db.execute('SELECT * FROM products ORDER BY sort_order');
      return json(200, res.rows.map(rowToProduct));
    }

    if (event.httpMethod === 'POST') {
      const b = JSON.parse(event.body || '{}');
      await db.execute('UPDATE products SET sort_order = sort_order + 1');
      const id = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO products (id, title, description, image, price, discount_price, price_from, brand, category, status, tags_json, phone, whatsapp, note, including_vat, sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
        args: [
          id, str(b.title, 200), str(b.desc, 2000), str(b.image, 300),
          b.price ?? null, b.discount_price ?? null, b.price_from ? 1 : 0,
          str(b.brand, 100), str(b.category, 100), str(b.status, 50),
          JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
          str(b.phone, 20), str(b.whatsapp, 20), str(b.note, 500), str(b.including_vat, 5),
        ],
      });
      return json(200, { id });
    }

    if (event.httpMethod === 'PUT') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json(400, { error: 'Missing id' });
      const b = JSON.parse(event.body || '{}');
      const fields = [];
      const args = [];
      const map = {
        title: 'title', desc: 'description', image: 'image', price: 'price',
        discount_price: 'discount_price', price_from: 'price_from', brand: 'brand',
        category: 'category', status: 'status', phone: 'phone', whatsapp: 'whatsapp',
        note: 'note', including_vat: 'including_vat', order: 'sort_order',
      };
      for (const [bodyKey, col] of Object.entries(map)) {
        if (bodyKey in b) {
          fields.push(`${col} = ?`);
          args.push(bodyKey === 'price_from' ? (b[bodyKey] ? 1 : 0) : b[bodyKey]);
        }
      }
      if ('tags' in b) { fields.push('tags_json = ?'); args.push(JSON.stringify(b.tags || [])); }
      if (fields.length === 0) return json(400, { error: 'No fields to update' });
      args.push(id);
      await db.execute({ sql: `UPDATE products SET ${fields.join(', ')} WHERE id = ?`, args });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json(400, { error: 'Missing id' });
      await db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
