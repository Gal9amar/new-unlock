// Owner self-notification over WhatsApp via Green API (console.green-api.com) —
// a QR-paired "WhatsApp Web" style instance, so it needs no business
// verification and has no send waitlist. Silently no-ops until the three
// env vars are configured, so it's safe to deploy before setup is finished.
async function sendWhatsapp(chatPhone, text) {
  const { GREEN_API_ID_INSTANCE: idInstance, GREEN_API_TOKEN_INSTANCE: apiToken } = process.env;
  if (!idInstance || !apiToken || !chatPhone) return;

  try {
    await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${chatPhone}@c.us`, message: text }),
    });
  } catch (e) {
    console.error('WhatsApp send failed:', e.message);
  }
}

async function notifyOwnerWhatsapp(text) {
  await sendWhatsapp(process.env.OWNER_WHATSAPP_PHONE, text);
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

// Customer-facing message; never throws and no-ops when the number is invalid.
async function notifyCustomerWhatsapp(rawPhone, text) {
  const phone = toWhatsappPhone(rawPhone);
  if (!phone) return;
  await sendWhatsapp(phone, text);
}

module.exports = { notifyOwnerWhatsapp, notifyCustomerWhatsapp, toWhatsappPhone };
