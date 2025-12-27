import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAb5c6kmpAM5x5Bbsz_z7Y4vq_AY6QlC7w",
  authDomain: "trackbookmark-956.firebaseapp.com",
  projectId: "trackbookmark-956",
  storageBucket: "trackbookmark-956.firebasestorage.app",
  messagingSenderId: "759316186111",
  appId: "1:759316186111:web:439d1b070f12b89eb79dca",
  measurementId: "G-GJ6MRER9SV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, auth, db };
