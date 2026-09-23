import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

/**
 * Set NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1 to point the app at the local
 * emulators instead of the real project. Used for profiling and manual testing
 * against seeded data, so neither ever touches production.
 */
const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app =
  getApps().length === 0
    ? initializeApp(
        USE_EMULATOR ? { ...firebaseConfig, projectId: "demo-test", apiKey: "demo-key" } : firebaseConfig,
      )
    : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

if (USE_EMULATOR && getApps().length === 1) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app, auth, db };
