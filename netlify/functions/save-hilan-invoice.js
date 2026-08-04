const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { hilanInvoiceHtml } = require('./_lib/hilan-invoice-html');
const { TEST_RECIPIENT_EMAIL, isProdOrigin } = require('./_lib/test-mode');
const { json, preflight, str } = require('./_lib/http');
const { escapeHtml } = require('./_lib/html-escape');
const { SITE_URL, VALID_PAYMENT } = require('./_lib/constants');
const { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull, footerAdmin } = require('./_lib/email-shell');

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
  if (!VALID_PAYMENT.includes(b.payment_method)) return json(400, { error: 'Invalid payment_method' });

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
    const name = escapeHtml(data.name);
    const phone = escapeHtml(data.phone);
    const email = escapeHtml(data.email);

    const clientHtml = emailWrapper(600, `
        ${emailHeader({ logoWidth: 140, tagline: 'בקשת חשבונית חדשה' })}
        ${emailBadge({ bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', text: '✓ &nbsp;הפרטים התקבלו בהצלחה!' })}
        <tr>
          <td style="padding:28px 40px 32px;text-align:center;">
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.8;">
              תודה רבה! קיבלנו את הפרטים בהצלחה. חשבונית דיגיטלית תונפק ותישלח אליך במהירות האפשרית.
            </p>
            ${ctaRow([
              ctaButton('phone', 'tel:0533888381', '📞 &nbsp;053-388-8381'),
              ctaButton('whatsapp', 'https://wa.me/972533888381', '💬 &nbsp;שלח לנו וואטסאפ'),
            ])}
          </td>
        </tr>
        ${footerFull()}`);

    const adminHtml = emailWrapper(600, `
        ${emailHeader({ logoWidth: 120, tagline: 'בקשת חשבונית מפורטת חדשה 📄' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="font-size:13px;color:#94a3b8;width:90px;">טלפון</td>
                <td style="font-size:14px;"><a href="tel:${phone}" style="color:#1d4ed8;font-weight:600;text-decoration:none;font-family:monospace;">${phone}</a></td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#94a3b8;width:90px;padding-top:6px;">מייל</td>
                <td style="font-size:14px;padding-top:6px;"><a href="mailto:${email}" style="color:#1d4ed8;font-weight:600;text-decoration:none;font-family:monospace;">${email}</a></td>
              </tr>
            </table>
            ${invoiceTableHtml}
            ${ctaRow([ctaButton('success', markUrl, '✅ &nbsp;הופקה חשבונית — שלח ללקוח אישור', { padding: '16px 0' })])}
          </td>
        </tr>
        ${footerAdmin()}`);

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
