
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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


export { app, db, storage, auth };
