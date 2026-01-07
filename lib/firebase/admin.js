import admin from 'firebase-admin';

function readEnvAny(keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function getPrivateKey() {
  const raw = readEnvAny([
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_ADMIN_PRIVATE_KEY_PEM',
    'FIREBASE_PRIVATE_KEY_PEM',
  ]);

  if (raw) {
    // Support dotenv style: "-----BEGIN...\\n...\\n-----END...\\n"
    return raw.replace(/\\n/g, '\n');
  }

  const b64 = readEnvAny(['FIREBASE_ADMIN_PRIVATE_KEY_BASE64', 'FIREBASE_PRIVATE_KEY_BASE64']);
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      return decoded.replace(/\\n/g, '\n');
    } catch {
      return undefined;
    }
  }

  return undefined;
}

let initAttempted = false;

function tryInit() {
  if (initAttempted) return;
  initAttempted = true;

  if (admin.apps.length) return;

  const projectId = readEnvAny([
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_PROJECT_ID',
    'GOOGLE_CLOUD_PROJECT',
    'GCLOUD_PROJECT',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ]);

  const clientEmail = readEnvAny([
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_EMAIL',
  ]);

  const privateKey = getPrivateKey();

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return;
  }

  // Fallback: allow GOOGLE_APPLICATION_CREDENTIALS / ADC based auth.
  // Useful for local dev when a service account JSON file path is configured.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

export function getAdminDb() {
  tryInit();
  if (!admin.apps.length) return null;
  return admin.firestore();
}

export function getAdminAuth() {
  tryInit();
  if (!admin.apps.length) return null;
  return admin.auth();
}

export default admin;
