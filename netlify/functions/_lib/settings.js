const { getDb } = require('./db');

// Admin-controlled on/off switches, stored in the `settings` table so a change
// in the admin page takes effect immediately, with no redeploy. A switch with
// no stored row uses its default, so nothing changes until someone flips it.
const DEFAULTS = {
  whatsapp_customers: true, // WhatsApp messages sent to customers
  whatsapp_owner: true,     // WhatsApp alerts sent to the owner
};

let tableReady;
function ensureTable(db) {
  if (!tableReady) {
    tableReady = db.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
      .catch((e) => { tableReady = null; throw e; });
  }
  return tableReady;
}

async function getSettings() {
  const db = getDb();
  await ensureTable(db);
  const res = await db.execute('SELECT key, value FROM settings');
  const out = { ...DEFAULTS };
  for (const r of res.rows) {
    if (r.key in DEFAULTS) out[r.key] = r.value === '1';
  }
  return out;
}

// Never throws: if the settings can't be read, fall back to the default so a
// database hiccup doesn't silently stop (or start) messaging.
async function isEnabled(key) {
  try {
    return (await getSettings())[key];
  } catch (e) {
    console.error('settings read failed:', e.message);
    return DEFAULTS[key];
  }
}

async function setSetting(key, enabled) {
  if (!(key in DEFAULTS)) throw new Error('Unknown setting');
  const db = getDb();
  await ensureTable(db);
  await db.execute({
    sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, enabled ? '1' : '0'],
  });
}

module.exports = { DEFAULTS, getSettings, isEnabled, setSetting };
