const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');
const { sendWhatsappDetailed, toWhatsappPhone } = require('./_lib/whatsapp');
const { buildInvoiceConfirmationText } = require('./_lib/invoice-wa-text');

// Admin: simulates a sendinfo form submission by sending the customer
// confirmation WhatsApp, with sample details, to the given number. Writes
// nothing to the database and sends no emails. Body: {phone}.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
  const phone = toWhatsappPhone(b.phone);
  if (!phone) return json(400, { error: 'מספר טלפון לא תקין' });

  const text = buildInvoiceConfirmationText({
    name: 'לקוח לדוגמה',
    email: '',
    service_address: 'רחוב הדוגמה 1, יבנה',
    message: 'החלפת צילינדר (הודעת בדיקה מהאדמין)',
    amount: '350',
    vat_type: 'כולל מע"מ',
    payment_method: 'ביט',
  }, '[TEST] ');

  const result = await sendWhatsappDetailed(phone, text);
  if (!result.ok) return json(502, { error: result.error });
  return json(200, { ok: true });
};
