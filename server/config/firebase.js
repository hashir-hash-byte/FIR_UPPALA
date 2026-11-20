const fs = require('fs');
const path = require('path');

let admin = null;
let enabled = false;
let bucket = null;

// Service account: JSON string in env (for Render/Railway) OR a local key file
function loadKey() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT || './server/config/serviceAccountKey.json');
  return fs.existsSync(keyPath) ? require(keyPath) : null;
}

try {
  const key = loadKey();
  if (key) {
    admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(key) });
    enabled = true;
    console.log('[firebase] Admin SDK ready');
  } else {
    console.log('[firebase] No service account -> DEV MODE (admin login: use the dev button)');
  }
} catch (e) {
  console.error('[firebase] init failed:', e.message);
}

module.exports = { admin, enabled, bucket };
