const { escapeHtml } = require('./html-escape');

function formatDateHe(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return (y && m && d) ? `${d}/${m}/${y}` : (iso || '');
}

function hilanItemRowsHtml(items) {
  return items.map((it, i) => `
    <tr>
      <td style="padding:10px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:10px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${escapeHtml(it.desc)}</td>
      <td style="padding:10px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;text-align:center;white-space:nowrap;">₪${it.price.toFixed(2)}</td>
      <td style="padding:10px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;text-align:center;">${it.qty}</td>
      <td style="padding:10px;font-size:13px;color:#1e293b;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700;white-space:nowrap;">₪${it.total.toFixed(2)}</td>
    </tr>`).join('');
}

function hilanInvoiceHtml(inv) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:20px;">
      <tr><td style="padding:18px 20px;">
        ${[
          ['לכבוד', escapeHtml(inv.name)],
          ['תאריך', formatDateHe(inv.date)],
          ['כתובת', escapeHtml(inv.service_address)],
          inv.id_number ? ['ח.פ / ת.ז', escapeHtml(inv.id_number)] : null,
        ].filter(Boolean).map(([label, val]) => `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
            <tr>
              <td style="font-size:13px;color:#94a3b8;width:90px;">${label}</td>
              <td style="font-size:14px;color:#1e293b;font-weight:600;">${val}</td>
            </tr>
          </table>`).join('')}
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:14px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <td style="padding:9px 10px;font-size:11px;color:#64748b;font-weight:700;">#</td>
          <td style="padding:9px 10px;font-size:11px;color:#64748b;font-weight:700;">תיאור השירות</td>
          <td style="padding:9px 10px;font-size:11px;color:#64748b;font-weight:700;text-align:center;">מחיר יח'</td>
          <td style="padding:9px 10px;font-size:11px;color:#64748b;font-weight:700;text-align:center;">כמות</td>
          <td style="padding:9px 10px;font-size:11px;color:#64748b;font-weight:700;text-align:left;">סה"כ</td>
        </tr>
      </thead>
      <tbody>${hilanItemRowsHtml(inv.items)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
      <tr><td style="padding:5px 10px;font-size:13px;color:#64748b;">סה"כ</td><td style="padding:5px 10px;font-size:13px;color:#1e293b;text-align:left;">₪${inv.subtotal.toFixed(2)}</td></tr>
      <tr><td style="padding:5px 10px;font-size:13px;color:#64748b;">מע"מ (18%)</td><td style="padding:5px 10px;font-size:13px;color:#1e293b;text-align:left;">₪${inv.vat.toFixed(2)}</td></tr>
      <tr><td style="padding:10px 10px 5px;font-size:16px;color:#0f172a;font-weight:800;border-top:1.5px solid #d4a853;">סה"כ כולל מע"מ</td><td style="padding:10px 10px 5px;font-size:16px;color:#0f172a;font-weight:800;text-align:left;border-top:1.5px solid #d4a853;">₪${inv.total.toFixed(2)}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr><td style="font-size:13px;color:#94a3b8;width:90px;">אמצעי תשלום</td><td style="font-size:14px;color:#1e293b;font-weight:600;">${inv.payment_method}</td></tr>
    </table>`;
}

module.exports = { formatDateHe, hilanItemRowsHtml, hilanInvoiceHtml };
