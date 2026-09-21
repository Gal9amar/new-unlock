// Owner self-notification over WhatsApp via Green API (console.green-api.com) —
// a QR-paired "WhatsApp Web" style instance, so it needs no business
// verification and has no send waitlist. Silently no-ops until the three
// env vars are configured, so it's safe to deploy before setup is finished.
const { isEnabled, getSettings } = require('./settings');

function apiUrl(method) {
  const { GREEN_API_ID_INSTANCE: idInstance, GREEN_API_TOKEN_INSTANCE: apiToken } = process.env;
  return idInstance && apiToken ? `https://api.green-api.com/waInstance${idInstance}/${method}/${apiToken}` : '';
}

// Returns true only if Green API accepted the message.
async function sendWhatsapp(chatPhone, text) {
  const url = apiUrl('sendMessage');
  if (!url || !chatPhone) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${chatPhone}@c.us`, message: text }),
    });
    return res.ok;
  } catch (e) {
    console.error('WhatsApp send failed:', e.message);
    return false;
  }
}

// Sends a file Green API downloads from `fileUrl` (must be publicly reachable),
// with `caption` as its text. Returns true only if Green API accepted it.
async function sendWhatsappFile(chatPhone, fileUrl, fileName, caption) {
  const url = apiUrl('sendFileByUrl');
  if (!url || !chatPhone) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${chatPhone}@c.us`, urlFile: fileUrl, fileName, caption }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return !!data.idMessage;
  } catch (e) {
    console.error('WhatsApp file send failed:', e.message);
    return false;
  }
}

async function notifyOwnerWhatsapp(text) {
  if (!(await isEnabled('whatsapp_owner'))) return;
  await sendWhatsapp(toWhatsappPhone(process.env.OWNER_WHATSAPP_PHONE), text);
}

// Converts a customer-typed Israeli number (050-1234567, +972 50 123 4567,
// 501234567) to Green API's international format (972501234567). Returns ''
// for anything that doesn't look like a valid Israeli number, so callers skip
// the send instead of messaging a wrong chat.
function toWhatsappPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  let intl = '';
  if (digits.startsWith('972')) intl = digits;
  else if (digits.startsWith('0')) intl = '972' + digits.slice(1);
  else if (digits.length === 9) intl = '972' + digits;
  return /^972\d{8,9}$/.test(intl) ? intl : '';
}

// Where copies of customer messages go (admin settings: switch + number), or ''
// when copies are off, no number is set, or the copy would go to the customer.
async function getCopyPhone(customerPhone) {
  try {
    const s = await getSettings();
    if (!s.whatsapp_copy) return '';
    const phone = toWhatsappPhone(s.whatsapp_copy_phone);
    return phone && phone !== customerPhone ? phone : '';
  } catch (e) {
    console.error('copy settings read failed:', e.message);
    return '';
  }
}

function copyHeader(customerPhone, label) {
  const local = '0' + customerPhone.slice(3);
  return `📤 העתק של הודעה שנשלחה ללקוח${label ? ' ' + label : ''} (${local})`;
}

// Customer-facing message; never throws and no-ops when the number is invalid.
// A copy goes to the admin-configured copy number unless opts.copy is false.
// opts.label names the customer in the copy's header.
async function notifyCustomerWhatsapp(rawPhone, text, opts = {}) {
  const phone = toWhatsappPhone(rawPhone);
  if (!phone || !(await isEnabled('whatsapp_customers'))) return;
  const sent = await sendWhatsapp(phone, text);
  if (!sent || opts.copy === false) return;
  const copyTo = await getCopyPhone(phone);
  if (copyTo) await sendWhatsapp(copyTo, `${copyHeader(phone, opts.label)}\n\n${text}`);
}

// Sends a file to a customer. Returns true only if Green API accepted it, so the
// caller can fall back to a plain link message. Same copy behaviour as above.
async function notifyCustomerWhatsappFile(rawPhone, fileUrl, fileName, caption, opts = {}) {
  const phone = toWhatsappPhone(rawPhone);
  if (!phone || !(await isEnabled('whatsapp_customers'))) return false;
  const sent = await sendWhatsappFile(phone, fileUrl, fileName, caption);
  if (!sent) return false;
  if (opts.copy !== false) {
    const copyTo = await getCopyPhone(phone);
    if (copyTo) await sendWhatsappFile(copyTo, fileUrl, fileName, `${copyHeader(phone, opts.label)}\n\n${caption}`);
  }
  return true;
}

module.exports = { notifyOwnerWhatsapp, notifyCustomerWhatsapp, notifyCustomerWhatsappFile, toWhatsappPhone };
