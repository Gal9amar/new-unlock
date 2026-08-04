const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { json, preflight, str } = require('./_lib/http');

const VALID_STARS = ['1', '2', '3', '4', '5'];
const VALID_QUALITY = ['מצוינת', 'טובה', 'סבירה', 'גרועה'];
const VALID_ARRIVAL = ['מהיר מאוד', 'בזמן', 'איחר'];
const VALID_PRICE = ['שקוף ומשתלם', 'סביר', 'יקר'];
const VALID_ATTITUDE = ['מעולה', 'טוב', 'בינוני', 'לא טוב'];
const VALID_RECOMMEND = ['בהחלט', 'כנראה', 'לא'];

// Public: mirrors functions/index.js's `saveSurvey` export.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }

  if (!b.customer_name || !b.phone || !b.stars) return json(400, { error: 'Missing required fields' });
  if (!VALID_STARS.includes(String(b.stars))) return json(400, { error: 'Invalid stars value' });

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO surveys (id, customer_name, phone, stars, quality, arrival, price, attitude, recommend, comment, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        crypto.randomUUID(),
        str(b.customer_name, 100),
        str(b.phone, 20).replace(/[^\d+\-() ]/g, ''),
        String(b.stars),
        VALID_QUALITY.includes(b.quality) ? b.quality : '',
        VALID_ARRIVAL.includes(b.arrival) ? b.arrival : '',
        VALID_PRICE.includes(b.price) ? b.price : '',
        VALID_ATTITUDE.includes(b.attitude) ? b.attitude : '',
        VALID_RECOMMEND.includes(b.recommend) ? b.recommend : '',
        str(b.comment, 500),
        new Date().toISOString(),
      ],
    });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
