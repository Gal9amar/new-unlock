const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_lib/db');
const { json, preflight, str } = require('./_lib/http');

const MAX_ATTEMPTS = 8;
const SESSION_TTL = '7d';

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  const secret = process.env.AUTH_JWT_SECRET;
  if (!adminEmail || !secret) return json(500, { error: 'Auth not configured' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
  const code = str(body.code, 6).replace(/\D/g, '');
  if (code.length !== 6) return json(400, { error: 'Invalid code' });

  try {
    const db = getDb();
    const now = new Date().toISOString();
    const res = await db.execute({
      sql: `SELECT id, code_hash, attempts FROM auth_codes
            WHERE email = ? AND used = 0 AND expires_at > ?
            ORDER BY created_at DESC LIMIT 1`,
      args: [adminEmail, now],
    });

    if (res.rows.length === 0) return json(401, { error: 'Invalid or expired code' });
    const row = res.rows[0];

    if (Number(row.attempts) >= MAX_ATTEMPTS) {
      await db.execute({ sql: 'UPDATE auth_codes SET used = 1 WHERE id = ?', args: [row.id] });
      return json(401, { error: 'Invalid or expired code' });
    }

    if (row.code_hash !== hashCode(code)) {
      await db.execute({ sql: 'UPDATE auth_codes SET attempts = attempts + 1 WHERE id = ?', args: [row.id] });
      return json(401, { error: 'Invalid or expired code' });
    }

    await db.execute({ sql: 'UPDATE auth_codes SET used = 1 WHERE id = ?', args: [row.id] });

    const token = jwt.sign({ role: 'admin', email: adminEmail }, secret, { expiresIn: SESSION_TTL });
    return json(200, { ok: true, token });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
