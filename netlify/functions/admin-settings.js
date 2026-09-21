const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');
const { getSettings, setSetting, DEFAULTS } = require('./_lib/settings');

// Admin: read and change the on/off switches (currently the two WhatsApp ones).
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  try {
    if (event.httpMethod === 'GET') return json(200, await getSettings());

    if (event.httpMethod === 'PUT') {
      let b;
      try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
      if (!(b.key in DEFAULTS) || typeof b.enabled !== 'boolean') return json(400, { error: 'Invalid key or value' });
      await setSetting(b.key, b.enabled);
      return json(200, await getSettings());
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
