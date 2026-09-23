import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const rawAppId = import.meta.env.VITE_FIREBASE_APP_ID;

export const isFirebaseConfigured = Boolean(
  rawApiKey &&
    rawApiKey.trim() !== "" &&
    !rawApiKey.includes("your_api_key_here") &&
    rawApiKey !== "undefined"
);

const firebaseConfig = {
  apiKey: isFirebaseConfigured ? rawApiKey : "AIzaSyDummyKeyForDevelopment123456789",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${rawProjectId || "trace-6f541"}.firebaseapp.com`,
  projectId: rawProjectId || "trace-6f541",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${rawProjectId || "trace-6f541"}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "30992363510",
  appId: rawAppId || "1:30992363510:web:5b61c6861fbcad776121d7",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BPT24QMGP5",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(
  "https://www.googleapis.com/auth/classroom.courses.readonly"
);
googleProvider.addScope(
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
);
googleProvider.addScope(
  "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly"
);
googleProvider.addScope(
  "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly"
);
googleProvider.addScope(
  "https://www.googleapis.com/auth/classroom.announcements.readonly"
);
googleProvider.addScope("https://www.googleapis.com/auth/calendar");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.send"); // Required for full Calendar access (read/write)
googleProvider.addScope(
  "https://www.googleapis.com/auth/spreadsheets.readonly"
); // Required for reading attendance from Google Sheets
