
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Singleton initialization pattern to prevent "App already exists" errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific settings to fix latency issues
// We use initializeFirestore instead of getFirestore to ensure settings are applied immediately
// 1. experimentalForceLongPolling: true -> Fixes 1-2min timeout delays caused by WebSocket issues
// 2. localCache: persistentLocalCache -> Enables offline support and instant loading
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log('Firebase initialized with long polling and persistence');
} catch (e) {
  // If already initialized (e.g. hot reload), fall back to getting existing instance
  console.warn('Firestore already initialized, using existing instance', e);
  db = getFirestore(app);
}

export { db };
export const auth = getAuth(app);

// Export commonly used firestore methods for cleaner imports in App.tsx
export { doc, setDoc, onSnapshot };
