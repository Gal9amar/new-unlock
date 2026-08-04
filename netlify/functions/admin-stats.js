const { getDb } = require('./_lib/db');
const { verifyAdmin } = require('./_lib/verify-admin');
const { json, preflight } = require('./_lib/http');

// Admin: mirrors functions/index.js's `adminStats`, but computed with real SQL
// aggregates (COUNT/SUM/AVG) instead of pulling full collections into memory.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!verifyAdmin(event)) return json(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const db = getDb();
    const [
      surveysTotal, surveysMonth, avgStars,
      invoicesTotal, invoicesMonth, invoicesPending, revenue,
      productsTotal,
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as n FROM surveys'),
      db.execute({ sql: 'SELECT COUNT(*) as n FROM surveys WHERE created_at >= ?', args: [startOfMonth] }),
      db.execute("SELECT AVG(CAST(stars AS REAL)) as avg FROM surveys WHERE stars GLOB '[0-9]*'"),
      db.execute('SELECT COUNT(*) as n FROM invoices'),
      db.execute({ sql: 'SELECT COUNT(*) as n FROM invoices WHERE created_at >= ?', args: [startOfMonth] }),
      db.execute('SELECT COUNT(*) as n FROM invoices WHERE invoice_issued = 0'),
      db.execute("SELECT SUM(CAST(amount AS REAL)) as total FROM invoices WHERE invoice_issued = 1 AND amount != ''"),
      db.execute('SELECT COUNT(*) as n FROM products'),
    ]);

    return json(200, {
      surveys: {
        total: Number(surveysTotal.rows[0].n),
        thisMonth: Number(surveysMonth.rows[0].n),
        avgStars: avgStars.rows[0].avg != null ? Number(avgStars.rows[0].avg).toFixed(1) : null,
      },
      invoices: {
        total: Number(invoicesTotal.rows[0].n),
        thisMonth: Number(invoicesMonth.rows[0].n),
        pending: Number(invoicesPending.rows[0].n),
        totalRevenue: Math.round(Number(revenue.rows[0].total) || 0),
      },
      products: { total: Number(productsTotal.rows[0].n) },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
