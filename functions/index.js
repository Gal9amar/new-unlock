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
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="https://www.hamanulan.com/images/footer-logo.png" alt="UNLOCK" width="140" style="display:block;margin:0 auto 12px;"/>
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;">שירותי מנעולנות מקצועיים · 24/7</p>
          </td>
        </tr>

        <!-- Success badge -->
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:50px;padding:10px 24px;">
              <span style="color:#16a34a;font-size:15px;font-weight:600;">✓ &nbsp;החשבונית הופקה בהצלחה</span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${to_name} 😊</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.8;">
              שמחים לעדכן אותך שהחשבונית עבור השירות שקיבלת<br/>הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>

            <!-- Thank you message -->
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">תודה שבחרת ב-UNLOCK מנעולנות 🔐</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.9;">
              היה לנו עונג לשרת אותך!<br/>
              בכל פעם שתזדקק לשירותי מנעולנות — פתיחת דלת נעולה, החלפת צילינדר, התקנת מנעול חכם ועוד — אנחנו כאן בשבילך, מגיעים אליך תוך זמן קצר בכל שעה ביום ובלילה.<br/><br/>
              נשמח לראותך שוב! 😊
            </p>

            <!-- CTA buttons -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="tel:0533888381" style="display:inline-block;width:100%;max-width:340px;padding:14px 0;background:#f8f4ec;color:#92650a;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #e9d8b4;box-sizing:border-box;">📞 &nbsp;053-388-8381</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="https://wa.me/972533888381" style="display:inline-block;width:100%;max-width:340px;padding:14px 0;background:#f0fdf4;color:#15803d;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #bbf7d0;box-sizing:border-box;">💬 &nbsp;שלח לנו וואטסאפ</a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="https://www.hamanulan.com" style="display:inline-block;width:100%;max-width:340px;padding:14px 0;background:#f0f4ff;color:#3730a3;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #c7d2fe;box-sizing:border-box;">🌐 &nbsp;כניסה לאתר שלנו</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #eef0f3;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;font-weight:600;">UNLOCK מנעולנות | גבי המנעולן</p>
            <p style="margin:0;color:#cbd5e1;font-size:12px;">שירות 24/7 · אזור המרכז והדרום · <a href="https://www.hamanulan.com" style="color:#94a3b8;text-decoration:none;">hamanulan.com</a></p>
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
