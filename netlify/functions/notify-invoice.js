const { verifyAdmin } = require('./_lib/verify-admin');
const { sendMail } = require('./_lib/mail');
const { json, preflight, str } = require('./_lib/http');
const { escapeHtml } = require('./_lib/html-escape');
const { SITE_URL } = require('./_lib/constants');
const { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull } = require('./_lib/email-shell');

// Admin: manual re-send of the "invoice ready" email, mirrors `notifyInvoice`.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
  const to_email = str(body.to_email, 100);
  const to_name = str(body.to_name, 100);
  const amount = str(body.amount, 30);
  const vat_type = str(body.vat_type, 30);
  const service_address = str(body.service_address, 200);
  if (!to_email || !to_name) return json(400, { error: 'Missing to_email or to_name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) return json(400, { error: 'Invalid email' });

  const name = escapeHtml(to_name);

  const htmlBody = emailWrapper(560, `
        ${emailHeader({ logoWidth: 140, tagline: 'שירותי מנעולנות מקצועיים · 24/7' })}
        ${emailBadge({ bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', text: '✓ &nbsp;החשבונית הופקה בהצלחה' })}
        <tr>
          <td style="padding:28px 40px 32px;">
            <p style="margin:0 0 6px;font-size:21px;font-weight:700;color:#1e293b;">שלום ${name} 😊</p>
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
            ${ctaRow([
              ctaButton('phone', 'tel:0533888381', '📞 &nbsp;053-388-8381', { padding: '14px 0' }),
              ctaButton('whatsapp', 'https://wa.me/972533888381', '💬 &nbsp;שלח לנו וואטסאפ', { padding: '14px 0' }),
              ctaButton('website', SITE_URL, '🌐 &nbsp;כניסה לאתר שלנו', { padding: '14px 0' }),
            ])}
          </td>
        </tr>
        ${footerFull()}`);

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
