const path = require('path');
const { createClient } = require('@libsql/client');

// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set as Netlify env vars in production.
// With no TURSO_DATABASE_URL (local dev, or before Turso credentials exist), falls
// back to a local libSQL file so functions can be built and tested without an
// account — same client, same SQL, only the connection target differs.
const LOCAL_DB_PATH = path.join(__dirname, '..', '..', '..', '.data', 'local.db');

let client;
function getDb() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  client = url
    ? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
    : createClient({ url: `file:${LOCAL_DB_PATH}` });
  return client;
}

module.exports = { getDb, LOCAL_DB_PATH };
