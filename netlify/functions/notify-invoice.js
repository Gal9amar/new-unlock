const { verifyAdmin } = require('./_lib/verify-admin');
const { sendMail } = require('./_lib/mail');
const { json, preflight } = require('./_lib/http');

const SITE_URL = 'https://www.hamanulan.com';

// Admin: manual re-send of the "invoice ready" email, mirrors `notifyInvoice`.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
  const { to_email, to_name, amount, vat_type, service_address } = body;
  if (!to_email || !to_name) return json(400, { error: 'Missing to_email or to_name' });

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
            <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;">שירותי מנעולנות מקצועיים · 24/7</p>
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
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${to_name} 😊</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.8;">
              שמחים לעדכן אותך שהחשבונית עבור השירות שקיבלת<br/>הופקה בהצלחה ונשלחה לתיבת הדואר שלך.
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;"/>
            <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#1e293b;">תודה שבחרת ב-UNLOCK מנעולנות 🔐</p>
            <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.9;">
              היה לנו עונג לשרת אותך!<br/>
              בכל פעם שתזדקק לשירותי מנעולנות — פתיחת דלת נעולה, החלפת צילינדר, התקנת מנעול חכם ועוד — אנחנו כאן בשבילך, מגיעים אליך תוך זמן קצר בכל שעה ביום ובלילה.<br/><br/>
              נשמח לראותך שוב! 😊
            </p>
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
                  <a href="${SITE_URL}" style="display:inline-block;width:100%;max-width:340px;padding:14px 0;background:#f0f4ff;color:#3730a3;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;text-align:center;border:1px solid #c7d2fe;box-sizing:border-box;">🌐 &nbsp;כניסה לאתר שלנו</a>
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

  try {
    await sendMail({
      from: '"UNLOCK מנעולנות" <unlock.yavne@gmail.com>',
      to: to_email,
      subject: '✓ החשבונית שלך הופקה בהצלחה – UNLOCK מנעולנות',
      html: htmlBody,
      text: `שלום ${to_name},\n\nהחשבונית הופקה בהצלחה.\n${amount ? `סכום: ₪${amount} ${vat_type || ''}` : ''}\n${service_address ? `כתובת: ${service_address}` : ''}\n\nלשאלות: 053-388-8381\nUNLOCK מנעולנות`,
    });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
