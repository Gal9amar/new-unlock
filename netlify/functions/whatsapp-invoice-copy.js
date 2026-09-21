const crypto = require('crypto');
const { getDb } = require('./_lib/db');
const { isEnabled } = require('./_lib/settings');
const { json, str } = require('./_lib/http');
const { notifyOwnerWhatsapp, notifyCustomerWhatsapp, notifyCustomerWhatsappFile, toWhatsappPhone } = require('./_lib/whatsapp');

// Called by a Google Apps Script running in the owner's Gmail (not by a browser),
// each time EZcount/Hyp's "download your document" copy email arrives. The email
// only carries the customer's name and a download link, so the phone number is
// looked up here by name in the invoices + hilan_invoices tables.
//
// Protected by a shared secret (INVOICE_COPY_SECRET). A name with no matching
// request is sent to the owner instead of a customer.

const LOOKBACK_DAYS = 90;

function safeEqual(a, b) {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function normalizeName(s) {
  return String(s || '').replace(/["'׳״.,\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// The copy email belongs to the most recent request under that name, so older
// requests by the same name (returning customers, name collisions) are ignored:
// the newest matching request with a valid phone wins. Returns [] when none.
async function findCustomerPhones(name) {
  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const rows = [];
  for (const table of ['invoices', 'hilan_invoices']) {
    const res = await db.execute({
      sql: `SELECT name, phone, created_at FROM ${table} WHERE is_test = 0 AND created_at >= ?`,
      args: [since],
    });
    rows.push(...res.rows);
  }
  const target = normalizeName(name);
  const matches = rows
    .filter((r) => normalizeName(r.name) === target && toWhatsappPhone(r.phone))
    .sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
  return matches.length ? [toWhatsappPhone(matches[0].phone)] : [];
}

// EZcount's "copy" link 302-redirects to the PDF itself. Returns the final PDF
// URL, or '' if the link isn't an EZcount link or doesn't lead to a PDF (the
// caller then just sends the link as text).
async function resolvePdfUrl(url) {
  try {
    if (!/^https:\/\/([a-z0-9-]+\.)*ezcount\.co\.il\//i.test(url)) return '';
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    const isPdf = res.ok && /application\/pdf/i.test(res.headers.get('content-type') || '');
    if (res.body) res.body.cancel().catch(() => {});
    return isPdf ? res.url : '';
  } catch {
    return '';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = process.env.INVOICE_COPY_SECRET;
  if (!secret) return json(503, { error: 'Not configured' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid body' }); }
  if (!safeEqual(b.secret, secret)) return json(401, { error: 'Unauthorized' });

  const name = str(b.name, 100);
  const docType = str(b.doc_type, 60) || 'מסמך';
  const docNumber = str(b.doc_number, 20).replace(/[^\d]/g, '');
  const docLabel = docNumber ? `${docType} מספר ${docNumber}` : docType;
  const url = str(b.url, 2000);
  if (!name || !/^https:\/\/[^\s]+$/.test(url)) return json(400, { error: 'Missing name or https url' });

  try {
    // Customer WhatsApp switched off in the admin page: don't message the customer,
    // but still hand the owner the link so the document isn't lost.
    if (!(await isEnabled('whatsapp_customers'))) {
      await notifyOwnerWhatsapp([
        `${docLabel} עבור ${name}`,
        'שליחת וואטסאפ ללקוחות כבויה (הגדרות באדמין). העבר ידנית:',
        url,
      ].join('\n'));
      return json(200, { ok: true, sent: 'disabled' });
    }

    const phones = await findCustomerPhones(name);

    if (phones.length) {
      const text = [
        `שלום ${name} 😊`,
        '',
        `${docLabel} מצורפת.`,
        '',
        'תודה שבחרת בגבי המנעולן! 🔐',
        'לכל שאלה אנחנו זמינים 24/7: 053-388-8381',
      ].join('\n');

      const pdfUrl = await resolvePdfUrl(url);
      const fileSent = pdfUrl && await notifyCustomerWhatsappFile(phones[0], pdfUrl, `${docLabel}.pdf`, text);
      if (!fileSent) {
        // Couldn't attach the PDF: send the link instead so the customer still gets the document.
        await notifyCustomerWhatsapp(phones[0], text.replace('מצורפת.', 'להורדה:\n' + url));
      }
      return json(200, { ok: true, sent: 'customer', as: fileSent ? 'file' : 'link' });
    }

    await notifyOwnerWhatsapp([
      `⚠️ ${docLabel} עבור ${name} לא נשלחה ללקוח אוטומטית`,
      'לא נמצא טלפון תואם לפי שם.',
      'העבר ידנית:',
      url,
    ].join('\n'));
    return json(200, { ok: true, sent: 'owner' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
