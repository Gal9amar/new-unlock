const { getDb } = require('./_lib/db');
const { sendMail } = require('./_lib/mail');
const { TEST_RECIPIENT_EMAIL } = require('./_lib/test-mode');

const SITE_URL = 'https://www.hamanulan.com';

function html(body) {
  return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body };
}

// Public magic link. Mirrors functions/index.js's `markHilanInvoiceIssued`,
// respecting the `is_test` flag stored on the invoice at creation time.
exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) return { statusCode: 400, body: 'Missing id' };

  try {
    const db = getDb();
    const res = await db.execute({ sql: 'SELECT * FROM hilan_invoices WHERE id = ?', args: [id] });
    if (res.rows.length === 0) return { statusCode: 404, body: 'Invoice not found' };
    const inv = res.rows[0];

    if (inv.invoice_issued) {
      return html(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>כבר הופקה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2>✅ החשבונית כבר סומנה כהופקה</h2><p style="color:#64748b;">הלקוח כבר קיבל אישור.</p></body></html>`);
    }

    await db.execute({ sql: 'UPDATE hilan_invoices SET invoice_issued = 1 WHERE id = ?', args: [id] });

    const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:36px 40px 24px;text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="140" style="display:block;margin:0 auto 12px;"/>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:50px;padding:10px 24px;">
              <span style="color:#16a34a;font-size:15px;font-weight:600;">✓ &nbsp;החשבונית הופקה בהצלחה</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${inv.name} 😊</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.8;">
              החשבונית בסך ₪${Number(inv.total).toFixed(2)} הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">תודה שבחרת ב-UNLOCK מנעולנות! 🔐</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="tel:0533888381" style="display:inline-block;width:100%;max-width:320px;padding:13px 0;background:#f8f4ec;color:#92650a;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #e9d8b4;box-sizing:border-box;">📞 &nbsp;053-388-8381</a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${SITE_URL}" style="display:inline-block;width:100%;max-width:320px;padding:13px 0;background:#f0f4ff;color:#3730a3;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #c7d2fe;box-sizing:border-box;">🌐 &nbsp;כניסה לאתר שלנו</a>
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

    const isTestMode = !!inv.is_test;
    await sendMail({
      from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
      to: isTestMode ? TEST_RECIPIENT_EMAIL : inv.email,
      subject: `${isTestMode ? '[TEST] ' : ''}✓ החשבונית שלך הופקה בהצלחה – UNLOCK מנעולנות`,
      html: htmlBody,
      text: `שלום ${inv.name}, החשבונית הופקה בהצלחה. תודה שבחרת ב-UNLOCK מנעולנות! לשאלות: 053-388-8381`,
    });

    return html(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><title>הופקה בהצלחה</title></head><body style="font-family:Arial;text-align:center;padding:60px;direction:rtl;"><h2 style="color:#16a34a;">✅ החשבונית הופקה ואישור נשלח ל-${inv.name}</h2><p style="color:#64748b;">הסטטוס עודכן במערכת ומייל אישור נשלח ללקוח.</p></body></html>`);
  } catch (e) {
    return { statusCode: 500, body: 'שגיאה: ' + e.message };
  }
};
