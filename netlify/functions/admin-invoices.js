const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');
const { notifyOwnerWhatsapp } = require('./_lib/whatsapp');

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
      const issued = b.invoice_issued ? 1 : 0;

      let toNotify = null;
      if (issued) {
        const cur = await db.execute({ sql: 'SELECT invoice_issued, name, amount, vat_type, service_address, is_test FROM invoices WHERE id = ?', args: [id] });
        if (cur.rows.length && !cur.rows[0].invoice_issued && !cur.rows[0].is_test) toNotify = cur.rows[0];
      }

      await db.execute({ sql: 'UPDATE invoices SET invoice_issued = ? WHERE id = ?', args: [issued, id] });
      if (toNotify) await notifyOwnerWhatsapp(`✅ חשבונית הופקה\n${toNotify.name}\n₪${toNotify.amount} ${toNotify.vat_type}\n${toNotify.service_address}`);
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
