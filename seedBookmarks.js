// Script to seed initial bookmarks for safayet.hossain95@gmail.com
// Run once: node seedBookmarks.js

import { initializeApp } from "firebase/app";
import { addDoc, collection, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAb5c6kmpAM5x5Bbsz_z7Y4vq_AY6QlC7w",
  authDomain: "trackbookmark-956.firebaseapp.com",
  projectId: "trackbookmark-956",
  storageBucket: "trackbookmark-956.firebasestorage.app",
  messagingSenderId: "759316186111",
  appId: "1:759316186111:web:439d1b070f12b89eb79dca",
  measurementId: "G-GJ6MRER9SV",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Replace with actual UID of safayet.hossain95@gmail.com once created
const TARGET_UID = "YOUR_UID_HERE"; // Get this from Firebase Console → Users

const sampleBookmarks = [
  {
    userId: TARGET_UID,
    folderName: "Development",
    urlName: "GitHub",
    link: "https://github.com",
  },
  {
    userId: TARGET_UID,
    folderName: "Development",
    urlName: "Stack Overflow",
    link: "https://stackoverflow.com",
  },
  {
    userId: TARGET_UID,
    folderName: "News",
    urlName: "BBC News",
    link: "https://bbc.com/news",
  },
  {
    userId: TARGET_UID,
    folderName: "Shopping",
    urlName: "Amazon",
    link: "https://amazon.com",
  },
];

async function seed() {
  try {
    for (const bookmark of sampleBookmarks) {
      const docRef = await addDoc(collection(db, "bookmarks"), bookmark);
      console.log("Added bookmark:", docRef.id);
    }
    console.log("Seeding complete!");
  } catch (e) {
    console.error("Error seeding:", e);
  }
}

seed();
