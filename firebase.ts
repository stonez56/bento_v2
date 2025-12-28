
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Use the environment variable as per system requirements
  apiKey: process.env.API_KEY,
  authDomain: "bento2-faa19.firebaseapp.com",
  projectId: "bento2-faa19",
  storageBucket: "bento2-faa19.firebasestorage.app",
  messagingSenderId: "932512319676",
  appId: "1:932512319676:web:aebed31d4dd3f0e6eb28b9"
};

// Singleton initialization pattern to prevent "App already exists" errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Export commonly used firestore methods for cleaner imports in App.tsx
export { doc, setDoc, onSnapshot };
