
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
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
const auth = getAuth(app);

// Connect to emulators in development.
// This check works for both client-side and server-side rendering in Next.js.
if (process.env.NODE_ENV === 'development') {
    // Check if emulators are already connected to prevent errors on hot-reloads
    // in the development environment.
    if (!auth.emulatorConfig) {
        console.log("Development mode: Connecting to Firebase Emulators");
        try {
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, 'localhost', 8080);
            connectStorageEmulator(storage, 'localhost', 9199);
            console.log("Successfully connected to emulators for both client and server.");
        } catch (error) {
            console.error("Error connecting to emulators:", error);
        }
    }
}

export { app, db, storage, auth };
