const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');
const REPO = 'Gal9amar/new-unlock';
const FILE = 'data/products.json';
const GITHUB_API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

// ── Auth middleware ──
async function verifyAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const token = auth.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// ── GitHub proxy function ──
exports.github = onRequest(
  { secrets: [GITHUB_TOKEN], cors: true },
  async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, PUT');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.status(204).send('');
      return;
    }

    res.set('Access-Control-Allow-Origin', '*');

    // Verify Firebase Auth
    const user = await verifyAuth(req, res);
    if (!user) return;

    const ghHeaders = {
      'Authorization': `token ${GITHUB_TOKEN.value()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Firebase-Function'
    };

    // GET – קריאת products.json
    if (req.method === 'GET') {
      const ghRes = await fetch(GITHUB_API, { headers: ghHeaders });
      const data = await ghRes.json();
      res.status(ghRes.status).json(data);
      return;
    }

    // PUT – כתיבת products.json
    if (req.method === 'PUT') {
      const { message, content, sha } = req.body;
      const ghRes = await fetch(GITHUB_API, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({ message, content, sha })
      });
      const data = await ghRes.json();
      res.status(ghRes.status).json(data);
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  }
);
