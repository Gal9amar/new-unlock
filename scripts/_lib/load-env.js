const fs = require('fs');
const path = require('path');

// Loads .env (repo root) into process.env for local scripts/tests. Never logs
// or returns values — callers should only ever read via process.env.<KEY>.
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

module.exports = { loadEnv };
