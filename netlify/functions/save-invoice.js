const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { messageBlocksHtml } = require('./_lib/messages');
const { json, preflight, str } = require('./_lib/http');
const { escapeHtml } = require('./_lib/html-escape');
const { SITE_URL, VALID_PAYMENT } = require('./_lib/constants');
const { TEST_RECIPIENT_EMAIL, isProdOrigin } = require('./_lib/test-mode');
const { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull, footerAdmin } = require('./_lib/email-shell');

const VALID_VAT = ['כולל מע"מ', 'לפני מע"מ'];

// Public: mirrors functions/index.js's `saveInvoice` export (sendinfo.html flow).
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }

  if (!b.name || !b.phone || !b.email || !b.service_address || !b.message || !b.amount || !b.vat_type || !b.payment_method) {
    return json(400, { error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return json(400, { error: 'Invalid email' });
  const amount = parseFloat(String(b.amount).replace(/[^0-9.]/g, ''));
  if (isNaN(amount) || amount <= 0 || amount > 999999) return json(400, { error: 'Invalid amount' });
  if (!VALID_VAT.includes(b.vat_type)) return json(400, { error: 'Invalid vat_type' });
  if (!VALID_PAYMENT.includes(b.payment_method)) return json(400, { error: 'Invalid payment_method' });

  const data = {
    id: crypto.randomUUID(),
    name: str(b.name, 100),
    phone: str(b.phone, 20).replace(/[^\d+\-() ]/g, ''),
    email: str(b.email, 100).toLowerCase(),
    id_number: str(b.id_number, 20).replace(/[^\d]/g, ''),
    service_address: str(b.service_address, 200),
    message: str(b.message, 2000),
    amount: amount.toString(),
    vat_type: b.vat_type,
    payment_method: b.payment_method,
    midrag_name: str(b.midrag_name, 100),
    is_test: !isProdOrigin(event),
  };

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO invoices (id, name, phone, email, id_number, service_address, message, amount, vat_type, payment_method, midrag_name, invoice_issued, is_test, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      args: [
        data.id, data.name, data.phone, data.email, data.id_number, data.service_address,
        data.message, data.amount, data.vat_type, data.payment_method, data.midrag_name,
        data.is_test ? 1 : 0, new Date().toISOString(),
      ],
    });

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
    const markUrl = `${SITE_URL}/.netlify/functions/mark-invoice-issued?id=${data.id}`;
    const testPrefix = data.is_test ? '[TEST] ' : '';
    const clientTo = data.is_test ? TEST_RECIPIENT_EMAIL : data.email;

    const name = escapeHtml(data.name);
    const phone = escapeHtml(data.phone);
    const email = escapeHtml(data.email);
    const idNumber = escapeHtml(data.id_number);
    const serviceAddress = escapeHtml(data.service_address);
    const midragName = escapeHtml(data.midrag_name);
    const amountLabel = `₪${escapeHtml(data.amount)} ${escapeHtml(data.vat_type)}`;
    const paymentMethod = escapeHtml(data.payment_method);

    const clientHtml = emailWrapper(560, `
        ${emailHeader({ logoWidth: 140, tagline: 'שירותי מנעולנות מקצועיים · 24/7' })}
        ${emailBadge({ bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', text: '✓ &nbsp;פנייתך התקבלה בהצלחה!' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${name} 😊</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.8;">
              קיבלנו את בקשתך להפקת חשבונית.<br/>
              ניצור עבורך את החשבונית בהקדם האפשרי ונשלח אותה ישירות לתיבת המייל שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#94a3b8;letter-spacing:1px;">העתק הבקשה שלך</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                ${[
                  ['שם מלא', name],
                  ['טלפון', phone],
                  ['כתובת שירות', serviceAddress],
                  ['תיאור השירות', messageBlocksHtml(data.message)],
                  ['סכום', amountLabel],
                  ['אמצעי תשלום', paymentMethod],
                ].map(([label, val]) => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                    <tr>
                      <td style="font-size:13px;color:#94a3b8;width:120px;vertical-align:top;padding-top:2px;">${label}</td>
                      <td style="font-size:14px;color:#1e293b;font-weight:500;line-height:1.6;">${val}</td>
                    </tr>
                  </table>`).join('')}
                ${data.payment_method === 'העברה בנקאית' ? `
                  <hr style="border:none;border-top:1px dashed #e2e8f0;margin:12px 0;"/>
                  <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#94a3b8;letter-spacing:1px;">פרטי חשבון לביצוע ההעברה</p>
                  ${[
                    ['בנק', 'מזרחי טפחות'],
                    ['סניף', '540'],
                    ['חשבון', '121889'],
                    ['שם', 'גל עמר'],
                  ].map(([label, val]) => `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td style="font-size:13px;color:#94a3b8;width:120px;">${label}</td>
                        <td style="font-size:14px;color:#1e293b;font-weight:600;">${val}</td>
                      </tr>
                    </table>`).join('')}
                ` : ''}
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.8;">
              לכל שאלה אנחנו זמינים עבורך 24/7 😊
            </p>
            ${ctaRow([
              ctaButton('phone', 'tel:0533888381', '📞 &nbsp;053-388-8381'),
              ctaButton('whatsapp', 'https://wa.me/972533888381', '💬 &nbsp;שלח לנו וואטסאפ'),
            ])}
          </td>
        </tr>
        ${footerFull()}`);

    const adminHtml = emailWrapper(560, `
        ${emailHeader({ logoWidth: 120, tagline: 'בקשת חשבונית חדשה 📄' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1e293b;">התקבלה בקשה מ-${name}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                ${[
                  ['שם', name, null],
                  ['טלפון', phone, `tel:${phone}`],
                  ['מייל', email, `mailto:${email}`],
                  data.id_number ? ['ח.פ / ת.ז', idNumber, null] : null,
                  ['כתובת', serviceAddress, null],
                  ['שירות', messageBlocksHtml(data.message), null],
                  ['סכום', amountLabel, null],
                  ['תשלום', paymentMethod, null],
                  data.midrag_name ? ['מידרג', midragName, null] : null,
                ].filter(Boolean).map(([label, val, link]) => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                    <tr>
                      <td style="font-size:12px;color:#94a3b8;width:90px;vertical-align:top;padding-top:3px;">${label}</td>
                      <td style="background:#f1f5f9;border-radius:6px;padding:5px 10px;">
                        ${link
                          ? `<a href="${link}" style="font-size:14px;color:#1d4ed8;font-weight:600;text-decoration:none;font-family:monospace;">${val}</a>`
                          : `<span style="font-size:14px;color:#1e293b;font-weight:500;">${val}</span>`
                        }
                      </td>
                    </tr>
                  </table>`).join('')}
              </td></tr>
            </table>
            ${ctaRow([ctaButton('success', markUrl, '✅ &nbsp;הופקה חשבונית — שלח ללקוח אישור', { padding: '16px 0' })])}
          </td>
        </tr>
        ${footerAdmin(`UNLOCK Admin · <a href="${SITE_URL}/pages/admin.html" style="color:#94a3b8;text-decoration:none;">כניסה לפאנל</a>`)}`);

    await Promise.all([
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: clientTo,
        subject: `${testPrefix}✓ פנייתך התקבלה – UNLOCK מנעולנות`,
        html: clientHtml,
        text: `שלום ${data.name}, פנייתך התקבלה. ניצור את החשבונית בהקדם. לשאלות: 053-388-8381`,
      }),
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: adminEmail,
        subject: `${testPrefix}📄 בקשת חשבונית חדשה – ${data.name}`,
        html: adminHtml,
        text: `בקשה חדשה מ-${data.name} (${data.phone})\nסכום: ₪${data.amount}\nלהנפקה: ${markUrl}`,
      }),
    ]);

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
