const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { hilanInvoiceHtml } = require('./_lib/hilan-invoice-html');
const { TEST_RECIPIENT_EMAIL, isProdOrigin } = require('./_lib/test-mode');
const { json, preflight, str } = require('./_lib/http');

const VALID_HILAN_PAYMENT = ['ביט', 'המחאה', 'העברה בנקאית', 'מזומן'];
const SITE_URL = 'https://www.hamanulan.com';

// Public: mirrors functions/index.js's `saveHilanInvoice` (hilan.html flow).
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }

  if (!b.name || !b.phone || !b.email || !b.service_address || !b.date || !Array.isArray(b.items) || !b.payment_method) {
    return json(400, { error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return json(400, { error: 'Invalid email' });
  if (!VALID_HILAN_PAYMENT.includes(b.payment_method)) return json(400, { error: 'Invalid payment_method' });

  const items = b.items
    .slice(0, 20)
    .map((it) => ({
      desc: str(it && it.desc, 200),
      price: Math.max(0, Math.min(999999, parseFloat(it && it.price) || 0)),
      qty: Math.max(0, Math.min(9999, parseFloat(it && it.qty) || 0)),
    }))
    .filter((it) => it.desc && it.price > 0 && it.qty > 0)
    .map((it) => ({ ...it, total: Math.round(it.price * it.qty * 100) / 100 }));

  if (items.length === 0) return json(400, { error: 'No valid items' });

  const subtotal = Math.round(items.reduce((s, it) => s + it.total, 0) * 100) / 100;
  const vat = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;

  const data = {
    id: crypto.randomUUID(),
    name: str(b.name, 100),
    phone: str(b.phone, 20).replace(/[^\d+\-() ]/g, ''),
    email: str(b.email, 100).toLowerCase(),
    id_number: str(b.id_number, 20),
    service_address: str(b.service_address, 200),
    date: str(b.date, 20),
    items, subtotal, vat, total,
    payment_method: b.payment_method,
    is_test: !isProdOrigin(event),
  };

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO hilan_invoices (id, name, phone, email, id_number, service_address, invoice_date, items_json, subtotal, vat, total, payment_method, invoice_issued, is_test, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      args: [
        data.id, data.name, data.phone, data.email, data.id_number, data.service_address,
        data.date, JSON.stringify(items), subtotal, vat, total, data.payment_method,
        data.is_test ? 1 : 0, new Date().toISOString(),
      ],
    });

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
    const markUrl = `${SITE_URL}/.netlify/functions/mark-hilan-invoice-issued?id=${data.id}`;
    const invoiceTableHtml = hilanInvoiceHtml(data);

    const clientHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="140" style="display:block;margin:0 auto 12px;"/>
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;">בקשת חשבונית חדשה</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:50px;padding:10px 24px;">
              <span style="color:#1d4ed8;font-size:15px;font-weight:600;">✓ &nbsp;הפרטים התקבלו בהצלחה!</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;text-align:center;">
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.8;">
              תודה רבה! קיבלנו את הפרטים בהצלחה. חשבונית דיגיטלית תונפק ותישלח אליך במהירות האפשרית.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="tel:0533888381" style="display:inline-block;width:100%;max-width:320px;padding:13px 0;background:#f8f4ec;color:#92650a;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #e9d8b4;box-sizing:border-box;">📞 &nbsp;053-388-8381</a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="https://wa.me/972533888381" style="display:inline-block;width:100%;max-width:320px;padding:13px 0;background:#f0fdf4;color:#15803d;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #bbf7d0;box-sizing:border-box;">💬 &nbsp;שלח לנו וואטסאפ</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #eef0f3;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;font-weight:600;">UNLOCK מנעולנות | גבי המנעולן</p>
            <p style="margin:0;color:#cbd5e1;font-size:12px;">שירות 24/7 · אזור המרכז והדרום · <a href="${SITE_URL}" style="color:#94a3b8;text-decoration:none;">hamanulan.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const adminHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:28px 40px 20px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="120" style="display:block;margin:0 auto 10px;"/>
            <p style="margin:0;color:#64748b;font-size:14px;font-weight:600;">בקשת חשבונית מפורטת חדשה 📄</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="font-size:13px;color:#94a3b8;width:90px;">טלפון</td>
                <td style="font-size:14px;"><a href="tel:${data.phone}" style="color:#1d4ed8;font-weight:600;text-decoration:none;font-family:monospace;">${data.phone}</a></td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#94a3b8;width:90px;padding-top:6px;">מייל</td>
                <td style="font-size:14px;padding-top:6px;"><a href="mailto:${data.email}" style="color:#1d4ed8;font-weight:600;text-decoration:none;font-family:monospace;">${data.email}</a></td>
              </tr>
            </table>
            ${invoiceTableHtml}
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${markUrl}" style="display:inline-block;width:100%;max-width:340px;padding:16px 0;background:#16a34a;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;border-radius:12px;text-align:center;box-sizing:border-box;">✅ &nbsp;הופקה חשבונית — שלח ללקוח אישור</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #eef0f3;padding:16px 40px;text-align:center;">
            <p style="margin:0;color:#cbd5e1;font-size:12px;">UNLOCK Admin</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const clientTo = data.is_test ? TEST_RECIPIENT_EMAIL : data.email;
    const testPrefix = data.is_test ? '[TEST] ' : '';

    await Promise.all([
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: clientTo,
        subject: `${testPrefix}✓ בקשת חשבונית התקבלה — ₪${total.toFixed(2)}`,
        html: clientHtml,
        text: `שלום ${data.name}, בקשתך לחשבונית בסך ₪${total.toFixed(2)} התקבלה. ניצור את החשבונית בהקדם. לשאלות: 053-388-8381`,
      }),
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: adminEmail,
        subject: `${testPrefix}📄 בקשת חשבונית חדשה — ${data.name} (₪${total.toFixed(2)})`,
        html: adminHtml,
        text: `בקשה חדשה מ-${data.name} (${data.phone})\nסה"כ כולל מע"מ: ₪${total.toFixed(2)}\nלהנפקה: ${markUrl}`,
      }),
    ]);

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
