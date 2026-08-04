const { SITE_URL } = require('./constants');

// Shared building blocks for the transactional emails (invoice
// received/issued, hilan requests, manual notify). Previously each function
// duplicated the ~40-90 lines of header/footer/button markup verbatim —
// these helpers keep the visual output identical while removing the
// repetition. Content that legitimately differs per email (subject, body
// copy, which buttons) stays in the calling file.

function emailWrapper(tableWidth, innerHtml) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:36px 16px;">
    <tr><td align="center">
      <table width="${tableWidth}" cellpadding="0" cellspacing="0" style="max-width:${tableWidth}px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        ${innerHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailHeader({ logoWidth = 140, tagline = '' } = {}) {
  return `
        <tr>
          <td style="background:#ffffff;padding:${logoWidth === 140 ? '36px 40px 24px' : '28px 40px 20px'};text-align:center;border-bottom:1px solid #eef0f3;">
            <img src="${SITE_URL}/images/footer-logo.png" alt="UNLOCK" width="${logoWidth}" style="display:block;margin:0 auto ${logoWidth === 140 ? '12px' : '10px'};"/>
            ${tagline ? `<p style="margin:0;color:${logoWidth === 140 ? '#94a3b8;font-size:13px;letter-spacing:1px' : '#64748b;font-size:14px;font-weight:600'};">${tagline}</p>` : ''}
          </td>
        </tr>`;
}

function emailBadge({ bg, border, color, text }) {
  return `
        <tr>
          <td style="padding:28px 40px 0;text-align:center;">
            <div style="display:inline-block;background:${bg};border:1px solid ${border};border-radius:50px;padding:10px 24px;">
              <span style="color:${color};font-size:15px;font-weight:600;">${text}</span>
            </div>
          </td>
        </tr>`;
}

const BUTTON_STYLES = {
  phone: { bg: '#f8f4ec', color: '#92650a', border: '#e9d8b4' },
  whatsapp: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  website: { bg: '#f0f4ff', color: '#3730a3', border: '#c7d2fe' },
  success: { bg: '#16a34a', color: '#ffffff', border: '#16a34a' },
};

function ctaButton(variant, href, label, { padding = '13px 0' } = {}) {
  const s = BUTTON_STYLES[variant];
  const solid = variant === 'success';
  return `
                <td align="center">
                  <a href="${href}" style="display:inline-block;width:100%;max-width:340px;padding:${padding};background:${s.bg};color:${s.color};font-size:15px;font-weight:700;text-decoration:none;border-radius:${solid ? '12px' : '10px'};text-align:center;${solid ? '' : `border:1px solid ${s.border};`}box-sizing:border-box;">${label}</a>
                </td>`;
}

function ctaRow(buttons) {
  return `
            <table width="100%" cellpadding="0" cellspacing="0">
              ${buttons.map((b) => `<tr>${b}</tr>`).join('')}
            </table>`;
}

function footerFull() {
  return `
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #eef0f3;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;font-weight:600;">UNLOCK מנעולנות | גבי המנעולן</p>
            <p style="margin:0;color:#cbd5e1;font-size:12px;">שירות 24/7 · אזור המרכז והדרום · <a href="${SITE_URL}" style="color:#94a3b8;text-decoration:none;">hamanulan.com</a></p>
          </td>
        </tr>`;
}

function footerAdmin(text = 'UNLOCK Admin') {
  return `
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #eef0f3;padding:16px 40px;text-align:center;">
            <p style="margin:0;color:#cbd5e1;font-size:12px;">${text}</p>
          </td>
        </tr>`;
}

module.exports = { emailWrapper, emailHeader, emailBadge, ctaButton, ctaRow, footerFull, footerAdmin };
