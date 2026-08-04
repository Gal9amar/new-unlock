// TEMPORARY diagnostic endpoint — deleted right after use.
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hasSecret: !!process.env.AUTH_JWT_SECRET,
    secretLen: (process.env.AUTH_JWT_SECRET || '').length,
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    hasTurso: !!process.env.TURSO_DATABASE_URL,
    nodeVersion: process.version,
    deployId: process.env.DEPLOY_ID || process.env.BUILD_ID || 'unknown',
    context: process.env.CONTEXT || 'unknown',
  }),
});
