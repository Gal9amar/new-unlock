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
    'גבי המנעולן · 053-388-8381',
  ].join('\n');
}

module.exports = { buildInvoiceConfirmationText };
