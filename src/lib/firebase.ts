import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId || undefined);
const auth = getAuth(app);
const storage = getStorage(app);

// Secondary, isolated Firebase App instance for admin email/password sign-in.
// A Firebase Auth instance can only hold one signed-in user at a time — if
// the admin console signed in on the *primary* `auth`, it would silently
// evict the passenger/driver anonymous session (breaking ride/history
// ownership checks in firestore.rules, which key off `request.auth.uid`).
const adminApp = getApps().find(a => a.name === 'admin') || initializeApp(firebaseConfig, 'admin');
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp, config.firestoreDatabaseId || undefined);

// Test Firestore connection on initialization
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable'))) {
      console.warn("Firestore client operating in offline mode. Will automatically synchronize when connection resumes.");
    }
  }
}
testConnection();

export { app, db, auth, storage, adminApp, adminAuth, adminDb };
