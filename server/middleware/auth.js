const fb = require('../config/firebase');

// Verifies the Firebase ID token and checks the email is in ADMIN_EMAILS.
// DEV MODE (no service account, not production): token "dev-admin" is accepted.
module.exports = async function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    if (!fb.enabled) {
      if (process.env.NODE_ENV !== 'production' && token === 'dev-admin') { req.user = { email: 'dev@local' }; return next(); }
      return res.status(401).json({ error: 'Invalid dev token' });
    }
    const decoded = await fb.admin.auth().verifyIdToken(token);
    const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes((decoded.email || '').toLowerCase()) && !decoded.admin)
      return res.status(403).json({ error: 'This account is not an admin' });
    req.user = decoded; next();
  } catch (e) { res.status(401).json({ error: 'Invalid or expired token' }); }
};
