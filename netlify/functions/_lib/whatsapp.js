// Owner self-notification over WhatsApp via Green API (console.green-api.com) —
// a QR-paired "WhatsApp Web" style instance, so it needs no business
// verification and has no send waitlist. Silently no-ops until the three
// env vars are configured, so it's safe to deploy before setup is finished.
async function notifyOwnerWhatsapp(text) {
  const { GREEN_API_ID_INSTANCE: idInstance, GREEN_API_TOKEN_INSTANCE: apiToken, OWNER_WHATSAPP_PHONE: phone } = process.env;
  if (!idInstance || !apiToken || !phone) return;

  try {
    await fetch(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${phone}@c.us`, message: text }),
    });
  } catch (e) {
    console.error('WhatsApp notify failed:', e.message);
  }
}

module.exports = { notifyOwnerWhatsapp };
