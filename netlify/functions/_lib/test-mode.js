// Same origin-based test/production detection used by saveHilanInvoice in the
// old Firebase function: any request whose Origin isn't a real production
// domain (localhost, file://, preview URLs, ...) is treated as non-production
// traffic, and the customer email is redirected to TEST_RECIPIENT_EMAIL instead
// of the real recipient.
const TEST_RECIPIENT_EMAIL = 'gal9amar@gmail.com';

function isProdOrigin(event) {
  const origin = event.headers.origin || event.headers.Origin;
  if (!origin) return false;
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://www.hamanulan.com,https://hamanulan.com')
    .split(',').map((s) => s.trim());
  return allowed.includes(origin);
}

module.exports = { TEST_RECIPIENT_EMAIL, isProdOrigin };
