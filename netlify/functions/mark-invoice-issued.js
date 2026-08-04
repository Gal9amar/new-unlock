const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { htmlResponse } = require('./_lib/http');
const { escapeHtml } = require('./_lib/html-escape');
const { SITE_URL } = require('./_lib/constants');
const { TEST_RECIPIENT_EMAIL } = require('./_lib/test-mode');
const { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull } = require('./_lib/email-shell');

// Magic link clicked from the admin notification email. A bare GET only
// renders a confirmation page with a real <form method="post"> — mail
// clients/scanners that pre-fetch links (Outlook Safe Links, Gmail image
// proxies) issue GET requests but never submit forms, so they can no longer
// mark an invoice issued (and email the customer) before a human clicks.
// The actual mutation only happens on POST.
exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Missing id' };

  if (event.httpMethod === 'GET') {
    return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>אישור הפקת חשבונית</title></head>
<body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;">
  <h2>סימון חשבונית כהופקה</h2>
  <p style="color:#64748b;">לחיצה על הכפתור תסמן את החשבונית כהופקה ותשלח ללקוח מייל אישור.</p>
  <form method="POST" action="/.netlify/functions/mark-invoice-issued?id=${encodeURIComponent(id)}">
    <button type="submit" style="padding:16px 32px;background:#16a34a;color:#fff;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;">✅ אשר הפקת חשבונית</button>
  </form>
</body></html>`);
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const db = getDb();
    const res = await db.execute({ sql: 'SELECT * FROM invoices WHERE id = ?', args: [id] });
    if (res.rows.length === 0) return { statusCode: 404, body: 'Invoice not found' };
    const inv = res.rows[0];

    if (inv.invoice_issued) {
      return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>כבר הופקה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2>✅ החשבונית כבר סומנה כהופקה</h2><p style="color:#64748b;">הלקוח כבר קיבל אישור.</p></body></html>`);
    }

    await db.execute({ sql: 'UPDATE invoices SET invoice_issued = 1 WHERE id = ?', args: [id] });

    const name = escapeHtml(inv.name);
    const isTestMode = !!inv.is_test;

    const htmlBody = emailWrapper(560, `
        ${emailHeader({ logoWidth: 140, tagline: 'שירותי מנעולנות מקצועיים · 24/7' })}
        ${emailBadge({ bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', text: '✓ &nbsp;החשבונית הופקה בהצלחה' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${name} 😊</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.8;">
              החשבונית עבור השירות שקיבלת הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">תודה שבחרת ב-UNLOCK מנעולנות! 🔐</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.9;">
              היה לנו עונג לשרת אותך!<br/>
              בכל פעם שתזדקק לשירותי מנעולנות — פתיחת דלת נעולה, החלפת צילינדר, התקנת מנעול חכם ועוד — אנחנו כאן בשבילך, מגיעים אליך תוך זמן קצר בכל שעה ביום ובלילה.<br/><br/>
              נשמח לראותך שוב! 😊
            </p>
            ${ctaRow([
              ctaButton('phone', 'tel:0533888381', '📞 &nbsp;053-388-8381'),
              ctaButton('whatsapp', 'https://wa.me/972533888381', '💬 &nbsp;שלח לנו וואטסאפ'),
              ctaButton('website', SITE_URL, '🌐 &nbsp;כניסה לאתר שלנו'),
            ])}
          </td>
        </tr>
        ${footerFull()}`);

    await sendMail({
      from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
      to: isTestMode ? TEST_RECIPIENT_EMAIL : inv.email,
      subject: `${isTestMode ? '[TEST] ' : ''}✓ החשבונית שלך הופקה בהצלחה – UNLOCK מנעולנות`,
      html: htmlBody,
      text: `שלום ${inv.name}, החשבונית הופקה בהצלחה. תודה שבחרת ב-UNLOCK מנעולנות! לשאלות: 053-388-8381`,
    });

    return htmlResponse(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>הופקה בהצלחה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2 style="color:#16a34a;">✅ החשבונית הופקה ואישור נשלח ל-${name}</h2><p style="color:#64748b;">הסטטוס עודכן במערכת ומייל אישור נשלח ללקוח.</p></body></html>`);
  } catch (e) {
    return { statusCode: 500, body: 'שגיאה: ' + escapeHtml(e.message) };
  }
};
