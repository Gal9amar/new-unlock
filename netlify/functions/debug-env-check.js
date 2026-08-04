// TEMPORARY diagnostic endpoint — deleted right after use.
const jwt = require('jsonwebtoken');
const { verifyAdmin } = require('./_lib/verify-admin');

exports.handler = async (event) => {
  const secret = process.env.AUTH_JWT_SECRET;
  let selfRoundTrip = null;
  try {
    const token = jwt.sign({ role: 'admin', email: 'x@x.com' }, secret, { expiresIn: '5m' });
    const decoded = jwt.verify(token, secret);
    selfRoundTrip = { ok: true, decoded };
  } catch (e) {
    selfRoundTrip = { ok: false, error: e.message, name: e.name };
  }

  let incomingTokenCheck = null;
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (auth.startsWith('Bearer ')) {
    const incoming = auth.slice('Bearer '.length);
    try {
      incomingTokenCheck = { ok: true, decoded: jwt.verify(incoming, secret) };
    } catch (e) {
      incomingTokenCheck = { ok: false, error: e.message, name: e.name };
    }
  }

  const verifyAdminResult = verifyAdmin(event);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonwebtokenVersion: require('jsonwebtoken/package.json').version,
      hasSecret: !!secret,
      secretLen: (secret || '').length,
      authHeaderPresent: !!auth,
      authHeaderPrefix: auth.slice(0, 15),
      selfRoundTrip,
      incomingTokenCheck,
      verifyAdminResult,
    }),
  };
};
