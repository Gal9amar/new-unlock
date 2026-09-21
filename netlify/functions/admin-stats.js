const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');

// Admin: mirrors functions/index.js's `adminStats`, but computed with real SQL
// aggregates (COUNT/SUM/AVG) instead of pulling full collections into memory.
// Accepts optional ?year=&month= (month 1-12) to view stats for a past month;
// defaults to the current month.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const now = new Date();
  const qs = event.queryStringParameters || {};
  const year = parseInt(qs.year, 10) || now.getFullYear();
  let month = parseInt(qs.month, 10) || (now.getMonth() + 1);
  month = Math.min(12, Math.max(1, month));

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const startOfNextMonth = new Date(year, month, 1).toISOString();

  try {
    const db = getDb();
    const [
      surveysTotal, surveysMonth, avgStarsMonth,
      invoicesTotal, invoicesMonth, invoicesPendingMonth, revenueMonth,
      productsTotal,
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as n FROM surveys'),
      db.execute({ sql: 'SELECT COUNT(*) as n FROM surveys WHERE created_at >= ? AND created_at < ?', args: [startOfMonth, startOfNextMonth] }),
      db.execute({ sql: "SELECT AVG(CAST(stars AS REAL)) as avg FROM surveys WHERE stars GLOB '[0-9]*' AND created_at >= ? AND created_at < ?", args: [startOfMonth, startOfNextMonth] }),
      db.execute('SELECT COUNT(*) as n FROM invoices'),
      db.execute({ sql: 'SELECT COUNT(*) as n FROM invoices WHERE created_at >= ? AND created_at < ?', args: [startOfMonth, startOfNextMonth] }),
      db.execute({ sql: 'SELECT COUNT(*) as n FROM invoices WHERE invoice_issued = 0 AND created_at >= ? AND created_at < ?', args: [startOfMonth, startOfNextMonth] }),
      db.execute({ sql: "SELECT SUM(CAST(amount AS REAL)) as total FROM invoices WHERE invoice_issued = 1 AND amount != '' AND created_at >= ? AND created_at < ?", args: [startOfMonth, startOfNextMonth] }),
      db.execute('SELECT COUNT(*) as n FROM products'),
    ]);

    return json(200, {
      year, month,
      surveys: {
        total: Number(surveysTotal.rows[0].n),
        thisMonth: Number(surveysMonth.rows[0].n),
        avgStars: avgStarsMonth.rows[0].avg != null ? Number(avgStarsMonth.rows[0].avg).toFixed(1) : null,
      },
      invoices: {
        total: Number(invoicesTotal.rows[0].n),
        thisMonth: Number(invoicesMonth.rows[0].n),
        pending: Number(invoicesPendingMonth.rows[0].n),
        totalRevenue: Math.round(Number(revenueMonth.rows[0].total) || 0),
      },
      products: { total: Number(productsTotal.rows[0].n) },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
