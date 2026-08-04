const https = require('https');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');

// Admin: mirrors functions/index.js's `triggerBuild` — dispatches the ssg.yml
// GitHub Action manually via the GitHub REST API.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const pat = process.env.GITHUB_PAT;
  if (!pat) return json(500, { error: 'GITHUB_PAT not configured' });

  const body = JSON.stringify({ ref: 'main' });

  try {
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.github.com',
        path: '/repos/Gal9amar/new-unlock/actions/workflows/ssg.yml/dispatches',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'unlock-netlify-function',
        },
      }, (r) => { r.resume(); r.on('end', resolve); });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    return json(200, { ok: true, message: 'GitHub Action triggered — יתעדכן תוך ~60 שניות' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
