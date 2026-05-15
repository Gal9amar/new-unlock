const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const https = require('https');

const GITHUB_PAT         = defineSecret('GITHUB_PAT');
const ADMIN_EMAIL        = defineSecret('ADMIN_EMAIL');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const ALLOWED_ORIGINS_STR = defineString('ALLOWED_ORIGINS', {
  default: 'https://www.hamanulan.com,https://hamanulan.com',
});

admin.initializeApp();
const db = admin.firestore();

// ── Auth middleware ──
async function verifyAdmin(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(auth.split('Bearer ')[1]);
    if (decoded.email !== ADMIN_EMAIL.value().trim()) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

function cors(req, res) {
  const origin = req.headers.origin;
  const allowedList = ALLOWED_ORIGINS_STR.value().split(',').map(s => s.trim());
  const allowed = allowedList.includes(origin) ? origin : allowedList[0];
  res.set('Access-Control-Allow-Origin', allowed);
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Vary', 'Origin');
}

// ── Public: GET all products ──
exports.products = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
  try {
    const snap = await db.collection('products').orderBy('order').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: CRUD products ──
exports.adminProducts = onRequest({ cors: true, secrets: [ADMIN_EMAIL] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);

  const user = await verifyAdmin(req, res);
  if (!user) return;

  const col = db.collection('products');

  if (req.method === 'GET') {
    const snap = await col.orderBy('order').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    return;
  }
  if (req.method === 'POST') {
    // Shift all existing products up by 1 so new product gets order=0 (first)
    const allSnap = await col.get();
    const batch = db.batch();
    allSnap.docs.forEach(doc => {
      batch.update(doc.ref, { order: (doc.data().order || 0) + 1 });
    });
    await batch.commit();
    const ref = await col.add({ ...req.body, order: 0 });
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

const VALID_STARS = ['1','2','3','4','5'];
const VALID_QUALITY = ['מצוינת','טובה','סבירה','גרועה'];
const VALID_ARRIVAL = ['מהיר מאוד','בזמן','איחר'];
const VALID_PRICE = ['שקוף ומשתלם','סביר','יקר'];
const VALID_ATTITUDE = ['מעולה','טוב','בינוני','לא טוב'];
const VALID_RECOMMEND = ['בהחלט','כנראה','לא'];

function str(val, max = 200) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max);
}

// ── Public: Save survey ──
exports.saveSurvey = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const b = req.body;
    if (!b.customer_name || !b.phone || !b.stars) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    if (!VALID_STARS.includes(String(b.stars))) {
      res.status(400).json({ error: 'Invalid stars value' }); return;
    }
    const data = {
      customer_name: str(b.customer_name, 100),
      phone: str(b.phone, 20).replace(/[^\d+\-() ]/g, ''),
      stars: String(b.stars),
      quality:   VALID_QUALITY.includes(b.quality)   ? b.quality   : '',
      arrival:   VALID_ARRIVAL.includes(b.arrival)   ? b.arrival   : '',
      price:     VALID_PRICE.includes(b.price)       ? b.price     : '',
      attitude:  VALID_ATTITUDE.includes(b.attitude) ? b.attitude  : '',
      recommend: VALID_RECOMMEND.includes(b.recommend) ? b.recommend : '',
      comment:   str(b.comment, 500),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('surveys').add(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const VALID_VAT = ['כולל מע"מ','לפני מע"מ'];
const VALID_PAYMENT = ['ביט','המחאה','העברה בנקאית','מזומן'];

// ── Public: Save invoice request ──
exports.saveInvoice = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const b = req.body;
    if (!b.name || !b.phone || !b.email || !b.service_address || !b.message || !b.amount || !b.vat_type || !b.payment_method) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) {
      res.status(400).json({ error: 'Invalid email' }); return;
    }
    const amount = parseFloat(String(b.amount).replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0 || amount > 999999) {
      res.status(400).json({ error: 'Invalid amount' }); return;
    }
    if (!VALID_VAT.includes(b.vat_type)) {
      res.status(400).json({ error: 'Invalid vat_type' }); return;
    }
    if (!VALID_PAYMENT.includes(b.payment_method)) {
      res.status(400).json({ error: 'Invalid payment_method' }); return;
    }
    const data = {
      name:            str(b.name, 100),
      phone:           str(b.phone, 20).replace(/[^\d+\-() ]/g, ''),
      email:           str(b.email, 100).toLowerCase(),
      id_number:       str(b.id_number, 20).replace(/[^\d]/g, ''),
      service_address: str(b.service_address, 200),
      message:         str(b.message, 500),
      amount:          amount.toString(),
      vat_type:        b.vat_type,
      payment_method:  b.payment_method,
      midrag_name:     str(b.midrag_name, 100),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('invoices').add(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: GET surveys ──
exports.adminSurveys = onRequest({ cors: true, secrets: [ADMIN_EMAIL] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
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

// ── Admin: Trigger GitHub Action (SSG → Netlify) ──
exports.triggerBuild = onRequest({ cors: true, secrets: [GITHUB_PAT, ADMIN_EMAIL] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);

  const user = await verifyAdmin(req, res);
  if (!user) return;

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const pat = GITHUB_PAT.value();
  const body = JSON.stringify({ ref: 'main' });

  try {
    await new Promise((resolve, reject) => {
      const reqGH = https.request({
        hostname: 'api.github.com',
        path: '/repos/Gal9amar/new-unlock/actions/workflows/ssg.yml/dispatches',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'unlock-firebase-function'
        }
      }, (r) => {
        r.resume();
        r.on('end', resolve);
      });
      reqGH.on('error', reject);
      reqGH.write(body);
      reqGH.end();
    });
    res.json({ ok: true, message: 'GitHub Action triggered — יתעדכן תוך ~60 שניות' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: Stats dashboard ──
exports.adminStats = onRequest({ cors: true, secrets: [ADMIN_EMAIL] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
  const user = await verifyAdmin(req, res);
  if (!user) return;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [surveysSnap, invoicesSnap, productsSnap] = await Promise.all([
    db.collection('surveys').get(),
    db.collection('invoices').get(),
    db.collection('products').get()
  ]);

  // סקרים
  const allSurveys = surveysSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
  const surveysThisMonth = allSurveys.filter(s => s.createdAt && s.createdAt >= startOfMonth).length;
  const starsValues = allSurveys.map(s => parseInt(s.stars)).filter(n => !isNaN(n));
  const avgStars = starsValues.length ? (starsValues.reduce((a, b) => a + b, 0) / starsValues.length).toFixed(1) : null;

  // חשבוניות
  const allInvoices = invoicesSnap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate?.() }));
  const invoicesThisMonth = allInvoices.filter(i => i.createdAt && i.createdAt >= startOfMonth).length;
  const pendingInvoices = allInvoices.filter(i => !i.invoice_issued).length;
  const totalRevenue = allInvoices
    .filter(i => i.invoice_issued && i.amount)
    .reduce((sum, i) => sum + (parseFloat(String(i.amount).replace(/[^0-9.]/g, '')) || 0), 0);

  // מוצרים
  const totalProducts = productsSnap.size;

  res.json({
    surveys: { total: allSurveys.length, thisMonth: surveysThisMonth, avgStars },
    invoices: { total: allInvoices.length, thisMonth: invoicesThisMonth, pending: pendingInvoices, totalRevenue: Math.round(totalRevenue) },
    products: { total: totalProducts }
  });
});

// ── Admin: Notify customer — invoice issued ──
exports.notifyInvoice = onRequest({ cors: true, secrets: [ADMIN_EMAIL, GMAIL_APP_PASSWORD] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);

  const user = await verifyAdmin(req, res);
  if (!user) return;

  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { to_email, to_name, amount, vat_type, service_address } = req.body;
  if (!to_email || !to_name) {
    res.status(400).json({ error: 'Missing to_email or to_name' }); return;
  }

  const appPassword = GMAIL_APP_PASSWORD.value();
  if (!appPassword) { res.status(500).json({ error: 'GMAIL_APP_PASSWORD not configured' }); return; }

  const FROM = 'unlock.yavne@gmail.com';

  const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1628 0%,#0f2247 50%,#1a365d 100%);padding:36px 40px;text-align:center;">
            <img src="https://www.hamanulan.com/images/footer-logo.png" alt="UNLOCK" width="160" style="display:block;margin:0 auto 16px;"/>
            <p style="margin:0;color:#d4a853;font-size:13px;letter-spacing:2px;text-transform:uppercase;">שירותי מנעולנות מקצועיים</p>
          </td>
        </tr>

        <!-- Green success bar -->
        <tr>
          <td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">✓ &nbsp; החשבונית הופקה בהצלחה</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 28px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a1628;">שלום ${to_name},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7;">
              החשבונית עבור השירות שקיבלת הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>

            <!-- Details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr><td style="padding:24px 28px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">פרטי השירות</p>
                ${amount ? `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding-bottom:8px;">סכום</td>
                    <td style="font-size:18px;font-weight:700;color:#0a1628;text-align:left;">₪${amount} <span style="font-size:13px;font-weight:400;color:#94a3b8;">${vat_type || ''}</span></td>
                  </tr>
                </table>` : ''}
                ${service_address ? `
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:14px;color:#64748b;padding-bottom:4px;">כתובת השירות</td>
                  </tr>
                  <tr>
                    <td style="font-size:15px;color:#0a1628;font-weight:500;">${service_address}</td>
                  </tr>
                </table>` : ''}
              </td></tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.7;">
              לכל שאלה או בירור, אנחנו זמינים עבורך 24/7.
            </p>

            <!-- CTA buttons -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="padding-left:8px;">
                  <a href="tel:0533888381" style="display:inline-block;padding:13px 28px;background:#d4a853;color:#0a1628;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">📞 &nbsp;053-388-8381</a>
                </td>
                <td style="padding-left:8px;">
                  <a href="https://wa.me/972533888381" style="display:inline-block;padding:13px 28px;background:#25d366;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">💬 &nbsp;וואטסאפ</a>
                </td>
                <td>
                  <a href="https://www.hamanulan.com" style="display:inline-block;padding:13px 28px;background:#0f2247;color:#d4a853;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">🌐 &nbsp;האתר שלנו</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a1628;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#d4a853;font-size:14px;font-weight:600;">UNLOCK מנעולנות | גבי המנעולן</p>
            <p style="margin:0;color:#64748b;font-size:12px;">שירות 24/7 · אזור המרכז והדרום · <a href="https://www.hamanulan.com" style="color:#d4a853;text-decoration:none;">hamanulan.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: FROM, pass: appPassword }
  });

  try {
    await transporter.sendMail({
      from: `"UNLOCK מנעולנות" <${FROM}>`,
      to: to_email,
      subject: '✓ החשבונית שלך הופקה בהצלחה – UNLOCK מנעולנות',
      html: htmlBody,
      text: `שלום ${to_name},\n\nהחשבונית הופקה בהצלחה.\n${amount ? `סכום: ₪${amount} ${vat_type||''}` : ''}\n${service_address ? `כתובת: ${service_address}` : ''}\n\nלשאלות: 053-388-8381\nUNLOCK מנעולנות`,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: GET invoices ──
exports.adminInvoices = onRequest({ cors: true, secrets: [ADMIN_EMAIL] }, async (req, res) => {
  if (req.method === 'OPTIONS') { cors(req, res); res.status(204).send(''); return; }
  cors(req, res);
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
