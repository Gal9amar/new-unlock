const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { json, preflight } = require('./_lib/http');

const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;
const CODE_TTL_MIN = 10;

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Public endpoint, takes no input — the only account that can ever receive a
// code is ADMIN_EMAIL (env var). This avoids leaking whether any other email
// is "the right one": every other kind of request would 404 on the frontend
// before it ever reaches here, since the login UI never asks for an address.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  if (!adminEmail) return json(500, { error: 'ADMIN_EMAIL not configured' });

  try {
    const db = getDb();
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const recent = await db.execute({
      sql: 'SELECT COUNT(*) as n FROM auth_codes WHERE email = ? AND created_at > ?',
      args: [adminEmail, windowStart],
    });
    if (Number(recent.rows[0].n) >= RATE_LIMIT_MAX) {
      return json(429, { error: 'Too many requests, try again later' });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CODE_TTL_MIN * 60 * 1000).toISOString();

    await db.execute({
      sql: 'INSERT INTO auth_codes (id, email, code_hash, expires_at, used, attempts, created_at) VALUES (?, ?, ?, ?, 0, 0, ?)',
      args: [crypto.randomUUID(), adminEmail, hashCode(code), expiresAt, now.toISOString()],
    });

    await sendMail({
      from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
      to: adminEmail,
      subject: `קוד כניסה לפאנל הניהול: ${code}`,
      text: `קוד הכניסה שלך: ${code}\nתקף ל-${CODE_TTL_MIN} דקות.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;padding:24px;">
        <p style="font-size:15px;color:#334155;">קוד הכניסה שלך לפאנל הניהול:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:4px;color:#0f172a;">${code}</p>
        <p style="font-size:13px;color:#94a3b8;">תקף ל-${CODE_TTL_MIN} דקות. אם לא ביקשת קוד זה, אפשר להתעלם מהמייל.</p>
      </div>`,
    });

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
