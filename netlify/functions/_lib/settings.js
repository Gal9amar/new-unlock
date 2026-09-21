const { getDb } = require('./db');

// Admin-controlled settings, stored in the `settings` table so a change in the
// admin page takes effect immediately, with no redeploy. A setting with no
// stored row uses its default, so nothing changes until someone edits it.
const DEFAULTS = {
  whatsapp_customers: true, // WhatsApp messages sent to customers
  whatsapp_owner: true,     // WhatsApp alerts sent to the owner
  whatsapp_copy: true,      // copy of each customer message to whatsapp_copy_phone
};
const TEXT_DEFAULTS = {
  whatsapp_copy_phone: '',  // international format, e.g. 972529070000; '' = no copies
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
  const out = { ...DEFAULTS, ...TEXT_DEFAULTS };
  for (const r of res.rows) {
    if (r.key in DEFAULTS) out[r.key] = r.value === '1';
    else if (r.key in TEXT_DEFAULTS) out[r.key] = String(r.value);
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

// `value` is a boolean for on/off settings and a string for text settings.
async function setSetting(key, value) {
  let stored;
  if (key in DEFAULTS) stored = value ? '1' : '0';
  else if (key in TEXT_DEFAULTS) stored = String(value);
  else throw new Error('Unknown setting');
  const db = getDb();
  await ensureTable(db);
  await db.execute({
    sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, stored],
  });
}

module.exports = { DEFAULTS, TEXT_DEFAULTS, getSettings, isEnabled, setSetting };
