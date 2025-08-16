
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Production environments (like App Hosting) will have FIREBASE_CONFIG available.
// Local development will use the individual NEXT_PUBLIC_ variables.
const firebaseConfig = process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG)
  : {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      apiKey: process.env.GEMINI_API_KEY, // Correction: Use the secure environment variable for the API key.
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    };

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Note: `auth` has been removed as it's no longer used for admin login.

// Connect to emulators if in development and the environment variable is set.
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    try {
        console.log("Development mode: Connecting to Firebase Emulators");
        // Check if emulators are already connected to prevent errors on hot-reloads
        // @ts-ignore - _settings is a private property but a reliable way to check
        if (!db._settings.host.includes('0.0.0.0')) {
            connectFirestoreEmulator(db, '0.0.0.0', 8080);
        }
        // @ts-ignore - _config is a private property
        if (!storage._config.emulator) {
            connectStorageEmulator(storage, '0.0.0.0', 9199);
        }
        console.log("Successfully connected to emulators.");
    } catch (error) {
        console.error("Error connecting to emulators:", error);
    }
}

export { app, db, storage };
