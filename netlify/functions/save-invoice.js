const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { messageBlocksHtml } = require('./_lib/messages');
const { json, preflight, str } = require('./_lib/http');

const VALID_VAT = ['כולל מע"מ', 'לפני מע"מ'];
const VALID_PAYMENT = ['ביט', 'המחאה', 'העברה בנקאית', 'מזומן'];
const SITE_URL = 'https://www.hamanulan.com';

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
  };

  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO invoices (id, name, phone, email, id_number, service_address, message, amount, vat_type, payment_method, midrag_name, invoice_issued, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      args: [
        data.id, data.name, data.phone, data.email, data.id_number, data.service_address,
        data.message, data.amount, data.vat_type, data.payment_method, data.midrag_name,
        new Date().toISOString(),
      ],
    });

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
    const markUrl = `${SITE_URL}/.netlify/functions/mark-invoice-issued?id=${data.id}`;

    const clientHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="140" style="display:block;margin:0 auto 12px;"/>
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;">שירותי מנעולנות מקצועיים · 24/7</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:50px;padding:10px 24px;">
              <span style="color:#1d4ed8;font-size:15px;font-weight:600;">✓ &nbsp;פנייתך התקבלה בהצלחה!</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${data.name} 😊</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.8;">
              קיבלנו את בקשתך להפקת חשבונית.<br/>
              ניצור עבורך את החשבונית בהקדם האפשרי ונשלח אותה ישירות לתיבת המייל שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#94a3b8;letter-spacing:1px;">העתק הבקשה שלך</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                ${[
                  ['שם מלא', data.name],
                  ['טלפון', data.phone],
                  ['כתובת שירות', data.service_address],
                  ['תיאור השירות', messageBlocksHtml(data.message)],
                  ['סכום', `₪${data.amount} ${data.vat_type}`],
                  ['אמצעי תשלום', data.payment_method],
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
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:28px 40px 20px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="120" style="display:block;margin:0 auto 10px;"/>
            <p style="margin:0;color:#64748b;font-size:14px;font-weight:600;">בקשת חשבונית חדשה 📄</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1e293b;">התקבלה בקשה מ-${data.name}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                ${[
                  ['שם', data.name, null],
                  ['טלפון', data.phone, `tel:${data.phone}`],
                  ['מייל', data.email, `mailto:${data.email}`],
                  data.id_number ? ['ח.פ / ת.ז', data.id_number, null] : null,
                  ['כתובת', data.service_address, null],
                  ['שירות', data.message, null],
                  ['סכום', `₪${data.amount} ${data.vat_type}`, null],
                  ['תשלום', data.payment_method, null],
                  data.midrag_name ? ['מידרג', data.midrag_name, null] : null,
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
            <p style="margin:0;color:#cbd5e1;font-size:12px;">UNLOCK Admin · <a href="${SITE_URL}/pages/admin.html" style="color:#94a3b8;text-decoration:none;">כניסה לפאנל</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await Promise.all([
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: data.email,
        subject: '✓ פנייתך התקבלה – UNLOCK מנעולנות',
        html: clientHtml,
        text: `שלום ${data.name}, פנייתך התקבלה. ניצור את החשבונית בהקדם. לשאלות: 053-388-8381`,
      }),
      sendMail({
        from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
        to: adminEmail,
        subject: `📄 בקשת חשבונית חדשה – ${data.name}`,
        html: adminHtml,
        text: `בקשה חדשה מ-${data.name} (${data.phone})\nסכום: ₪${data.amount}\nלהנפקה: ${markUrl}`,
      }),
    ]);

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
