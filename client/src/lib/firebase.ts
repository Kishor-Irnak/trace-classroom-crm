import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  }.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
