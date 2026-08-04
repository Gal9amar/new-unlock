const jwt = require('jsonwebtoken');

// Replaces the three separate admin-check implementations that existed across
// functions/index.js (Firebase ID token), netlify/functions/update-reviews.js
// (Identity Toolkit REST call), and admin.html's client-side email match.
// Single source of truth: a JWT signed by verify-code.js after a successful
// email-code login, checked here the same way on every protected endpoint.
function verifyAdmin(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  try {
    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) throw new Error('AUTH_JWT_SECRET not set');
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = { verifyAdmin };
