const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const ALLOWED_EMAIL = 'gal9amar@gmail.com';

// ── Auth middleware ──
async function verifyAdmin(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(auth.split('Bearer ')[1]);
    if (decoded.email !== ALLOWED_EMAIL) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

function cors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// ── Public: GET all products ──
exports.products = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);

  try {
    const snap = await db.collection('products').orderBy('order').get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: CRUD products ──
exports.adminProducts = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);

  const user = await verifyAdmin(req, res);
  if (!user) return;

  const col = db.collection('products');

  // GET – כל המוצרים לאדמין
  if (req.method === 'GET') {
    const snap = await col.orderBy('order').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    return;
  }

  // POST – הוספת מוצר
  if (req.method === 'POST') {
    const snap = await col.orderBy('order', 'desc').limit(1).get();
    const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order || 0) + 1;
    const ref = await col.add({ ...req.body, order: maxOrder });
    res.json({ id: ref.id });
    return;
  }

  // PUT – עדכון מוצר
  if (req.method === 'PUT') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await col.doc(id).update(req.body);
    res.json({ ok: true });
    return;
  }

  // DELETE – מחיקת מוצר
  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await col.doc(id).delete();
    res.json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});
