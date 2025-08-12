
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
    projectId: "fleettrack-go",
    appId: "1:791461246838:web:72da931c986d29066b2c57",
    storageBucket: "fleettrack-go.firebasestorage.app",
    apiKey: "AIzaSyDdsVOyr7K__oSQif1hpPCll3G11cX0vGk",
    authDomain: "fleettrack-go.firebaseapp.com",
    messagingSenderId: "791461246838",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

// Note: `auth` has been removed as it's no longer used for admin login.

// Connect to emulators if the environment variable is set.
// This is useful for development environments.
if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
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
