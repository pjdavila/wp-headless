import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "caribbean-business.firebaseapp.com",
  projectId: "caribbean-business",
  storageBucket: "caribbean-business.firebasestorage.app",
  messagingSenderId: "773828226262",
  appId: "1:773828226262:web:559b3b5b48abb26f382d77",
  measurementId: "G-QH4SG7BR3E",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

let messaging = null;
if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
  import("firebase/messaging").then(({ getMessaging }) => {
    messaging = getMessaging(app);
  }).catch(() => {});
}

function getMessagingInstance() {
  return messaging;
}

export { app, auth, db, messaging, getMessagingInstance, firebaseConfig };
