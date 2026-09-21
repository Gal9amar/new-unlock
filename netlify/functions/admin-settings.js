const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');
const { getSettings, setSetting, DEFAULTS, TEXT_DEFAULTS } = require('./_lib/settings');
const { toWhatsappPhone } = require('./_lib/whatsapp');

// Admin: read and change settings. Body of a PUT is {key, enabled} for on/off
// switches, or {key, value} for text settings (a phone number, '' to clear it).
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  try {
    if (event.httpMethod === 'GET') return json(200, await getSettings());

    if (event.httpMethod === 'PUT') {
      let b;
      try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }

      if (b.key in DEFAULTS) {
        if (typeof b.enabled !== 'boolean') return json(400, { error: 'Invalid value' });
        await setSetting(b.key, b.enabled);
      } else if (b.key in TEXT_DEFAULTS) {
        if (typeof b.value !== 'string') return json(400, { error: 'Invalid value' });
        const raw = b.value.trim();
        const phone = raw ? toWhatsappPhone(raw) : '';
        if (raw && !phone) return json(400, { error: 'מספר טלפון לא תקין' });
        await setSetting(b.key, phone);
      } else {
        return json(400, { error: 'Unknown setting' });
      }
      return json(200, await getSettings());
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
