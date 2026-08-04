const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');

// Admin: mirrors functions/index.js's `adminInvoices` export.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  const db = getDb();
  const id = event.queryStringParameters && event.queryStringParameters.id;

  try {
    if (event.httpMethod === 'PATCH') {
      if (!id) return json(400, { error: 'Missing id' });
      const b = JSON.parse(event.body || '{}');
      await db.execute({ sql: 'UPDATE invoices SET invoice_issued = ? WHERE id = ?', args: [b.invoice_issued ? 1 : 0, id] });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      if (!id) return json(400, { error: 'Missing id' });
      await db.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [id] });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'GET') {
      const res = await db.execute('SELECT * FROM invoices ORDER BY created_at DESC');
      return json(200, res.rows.map((r) => ({ ...r, invoice_issued: !!r.invoice_issued })));
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
