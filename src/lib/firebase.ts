
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdsVOyr7K__oSQif1hpPCll3G11cX0vGk",
  authDomain: "fleettrack-go.firebaseapp.com",
  projectId: "fleettrack-go",
  storageBucket: "fleettrack-go.appspot.com",
  messagingSenderId: "791461246838",
  appId: "1:791461246838:web:72da931c986d29066b2c57"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators if in development and the environment variable is set.
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    try {
        console.log("Development mode: Connecting to Firebase Emulators");
        // Check if emulators are already connected to prevent errors on hot-reloads
        // @ts-ignore - _settings is a private property but a reliable way to check
        if (!db.INTERNAL.settings.host.includes('localhost')) {
            connectFirestoreEmulator(db, 'localhost', 8080);
        }
        // @ts-ignore - _config is a private property
        if (!storage.INTERNAL.config.emulator) {
            connectStorageEmulator(storage, 'localhost', 9199);
        }
        console.log("Successfully connected to emulators.");
    } catch (error) {
        console.error("Error connecting to emulators:", error);
    }
}

export { app, db, storage };
