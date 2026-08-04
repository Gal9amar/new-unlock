const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');

// Admin: mirrors functions/index.js's `adminSurveys` export.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  const db = getDb();
  try {
    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json(400, { error: 'Missing id' });
      await db.execute({ sql: 'DELETE FROM surveys WHERE id = ?', args: [id] });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'GET') {
      const res = await db.execute('SELECT * FROM surveys ORDER BY created_at DESC');
      return json(200, res.rows);
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
