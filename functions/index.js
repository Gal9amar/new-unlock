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
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// ── Public: GET all products ──
exports.products = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);
  try {
    const snap = await db.collection('products').orderBy('order').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  if (req.method === 'GET') {
    const snap = await col.orderBy('order').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    return;
  }
  if (req.method === 'POST') {
    const snap = await col.orderBy('order', 'desc').limit(1).get();
    const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order || 0) + 1;
    const ref = await col.add({ ...req.body, order: maxOrder });
    res.json({ id: ref.id });
    return;
  }
  if (req.method === 'PUT') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await col.doc(id).update(req.body);
    res.json({ ok: true });
    return;
  }
  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await col.doc(id).delete();
    res.json({ ok: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
});

// ── Public: Save survey ──
exports.saveSurvey = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const data = {
      customer_name: req.body.customer_name || '',
      phone: req.body.phone || '',
      stars: req.body.stars || '',
      quality: req.body.quality || '',
      arrival: req.body.arrival || '',
      price: req.body.price || '',
      attitude: req.body.attitude || '',
      recommend: req.body.recommend || '',
      comment: req.body.comment || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('surveys').add(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public: Save invoice request ──
exports.saveInvoice = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const data = {
      name: req.body.name || '',
      phone: req.body.phone || '',
      email: req.body.email || '',
      id_number: req.body.id_number || '',
      service_address: req.body.service_address || '',
      message: req.body.message || '',
      amount: req.body.amount || '',
      vat_type: req.body.vat_type || '',
      payment_method: req.body.payment_method || '',
      midrag_name: req.body.midrag_name || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('invoices').add(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: GET surveys ──
exports.adminSurveys = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);
  const user = await verifyAdmin(req, res);
  if (!user) return;

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await db.collection('surveys').doc(id).delete();
    res.json({ ok: true });
    return;
  }

  const snap = await db.collection('surveys').orderBy('createdAt', 'desc').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() || '' })));
});

// ── Admin: GET invoices ──
exports.adminInvoices = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.status(204).send(''); return; }
  cors(res);
  const user = await verifyAdmin(req, res);
  if (!user) return;

  if (req.method === 'PATCH') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    const { invoice_issued } = req.body;
    await db.collection('invoices').doc(id).update({ invoice_issued: !!invoice_issued });
    res.json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'Missing id' }); return; }
    await db.collection('invoices').doc(id).delete();
    res.json({ ok: true });
    return;
  }

  const snap = await db.collection('invoices').orderBy('createdAt', 'desc').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() || '' })));
});
