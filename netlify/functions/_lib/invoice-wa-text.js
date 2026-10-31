// The customer-facing WhatsApp confirmation sent after the sendinfo form is
// submitted. Shared by save-invoice and the admin test so they never drift.
function buildInvoiceConfirmationText(data, testPrefix = '') {
  return [
    `${testPrefix}שלום ${data.name} 😊`,
    '',
    '✓ פנייתך התקבלה בהצלחה!',
    'קיבלנו את בקשתך להפקת חשבונית. ניצור עבורך את החשבונית בהקדם האפשרי ונשלח אותה ישירות ' + (data.email ? 'לתיבת המייל שלך.' : 'לוואטסאפ שלך.'),
    '',
    'העתק הבקשה שלך:',
    `כתובת שירות: ${data.service_address}`,
    `תיאור השירות: ${data.message}`,
    `סכום: ₪${data.amount} ${data.vat_type}`,
    `אמצעי תשלום: ${data.payment_method}`,
    ...(data.payment_method === 'העברה בנקאית'
      ? ['', 'פרטי חשבון לביצוע ההעברה:', 'בנק: מזרחי טפחות', 'סניף: 540', 'חשבון: 121889', 'שם: גל עמר']
      : []),
    '',
    'לכל שאלה אנחנו זמינים עבורך 24/7 😊',
    'גבי המנעולן',
  ].join('\n');
}

// Button on the confirmation: dials us through the phone's own dialer (not a WhatsApp call).
const CALL_BUTTON = { type: 'call', text: 'התקשר אל גבי', phoneNumber: '0533888381', display: '053-388-8381' };

// Contact card sent right after the confirmation, so the customer can save our number.
const OWNER_CONTACT_CARD = { phoneContact: 972533888381, firstName: 'גבי', lastName: 'המנעולן' };

module.exports = { buildInvoiceConfirmationText, CALL_BUTTON, OWNER_CONTACT_CARD };
