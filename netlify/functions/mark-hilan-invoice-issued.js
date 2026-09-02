const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { htmlResponse } = require('./_lib/http');
const { escapeHtml } = require('./_lib/html-escape');
const { SITE_URL } = require('./_lib/constants');
const { TEST_RECIPIENT_EMAIL } = require('./_lib/test-mode');
const { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull } = require('./_lib/email-shell');

// Same GET-renders-confirmation / POST-performs-mutation pattern as
// mark-invoice-issued.js — see the comment there for why.
exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Missing id' };

  if (event.httpMethod === 'GET') {
    const db = getDb();
    const res = await db.execute({ sql: 'SELECT * FROM hilan_invoices WHERE id = ?', args: [id] });
    if (res.rows.length === 0) return { statusCode: 404, body: 'Invoice not found' };
    const inv = res.rows[0];

    return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>אישור הפקת חשבונית</title></head>
<body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;">
  <h2>סימון חשבונית כהופקה</h2>
  <p style="color:#64748b;">${escapeHtml(inv.name)} · ₪${Number(inv.total).toFixed(2)}</p>
  <p style="color:#64748b;">לחיצה על הכפתור תסמן את החשבונית כהופקה ותשלח מייל אישור לכתובת שלמטה.</p>
  <form method="POST" action="/.netlify/functions/mark-hilan-invoice-issued?id=${encodeURIComponent(id)}">
    <div style="max-width:320px;margin:0 auto 20px;text-align:right;">
      <label for="copyEmail" style="display:block;font-size:14px;color:#475569;margin-bottom:6px;">שליחת העתק אל</label>
      <input type="email" id="copyEmail" name="email" value="${escapeHtml(inv.email)}" required style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;text-align:left;direction:ltr;"/>
    </div>
    <button type="submit" style="padding:16px 32px;background:#16a34a;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;">✅ אשר הפקת חשבונית</button>
  </form>
</body></html>`);
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const db = getDb();
    const res = await db.execute({ sql: 'SELECT * FROM hilan_invoices WHERE id = ?', args: [id] });
    if (res.rows.length === 0) return { statusCode: 404, body: 'Invoice not found' };
    const inv = res.rows[0];

    if (inv.invoice_issued) {
      return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>כבר הופקה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2>✅ החשבונית כבר סומנה כהופקה</h2><p style="color:#64748b;">הלקוח כבר קיבל אישור.</p></body></html>`);
    }

    const bodyStr = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    const submittedEmail = new URLSearchParams(bodyStr).get('email');
    const copyEmail = (submittedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail))
      ? submittedEmail.trim().toLowerCase()
      : inv.email;

    await db.execute({ sql: 'UPDATE hilan_invoices SET invoice_issued = 1, email = ? WHERE id = ?', args: [copyEmail, id] });

    const name = escapeHtml(inv.name);
    const isTestMode = !!inv.is_test;

    const htmlBody = emailWrapper(560, `
        ${emailHeader({ logoWidth: 140 })}
        ${emailBadge({ bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', text: '✓ &nbsp;החשבונית הופקה בהצלחה' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${name} 😊</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.8;">
              החשבונית בסך ₪${Number(inv.total).toFixed(2)} הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">תודה שבחרת ב-UNLOCK מנעולנות! 🔐</p>
            ${ctaRow([
              ctaButton('phone', 'tel:0533888381', '📞 &nbsp;053-388-8381'),
              ctaButton('website', SITE_URL, '🌐 &nbsp;כניסה לאתר שלנו'),
            ])}
          </td>
        </tr>
        ${footerFull()}`);

    await sendMail({
      from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
      to: isTestMode ? TEST_RECIPIENT_EMAIL : copyEmail,
      subject: `${isTestMode ? '[TEST] ' : ''}✓ החשבונית שלך הופקה בהצלחה – UNLOCK מנעולנות`,
      html: htmlBody,
      text: `שלום ${inv.name}, החשבונית הופקה בהצלחה. תודה שבחרת ב-UNLOCK מנעולנות! לשאלות: 053-388-8381`,
    });

    return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>הופקה בהצלחה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2 style="color:#16a34a;">✅ החשבונית הופקה ואישור נשלח ל-${name}</h2><p style="color:#64748b;">הסטטוס עודכן במערכת ומייל אישור נשלח ללקוח.</p></body></html>`);
  } catch (e) {
    return { statusCode: 500, body: 'שגיאה: ' + escapeHtml(e.message) };
  }
};
