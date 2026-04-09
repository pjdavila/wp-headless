const fs = require("fs");
const path = require("path");

const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";

const sw = `importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "${apiKey}",
  authDomain: "caribbean-business.firebaseapp.com",
  projectId: "caribbean-business",
  storageBucket: "caribbean-business.firebasestorage.app",
  messagingSenderId: "773828226262",
  appId: "1:773828226262:web:559b3b5b48abb26f382d77",
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var n = payload.notification || {};
  if (!n.title) return;
  self.registration.showNotification(n.title, {
    body: n.body || "",
    icon: n.icon || "/favicon.ico",
  });
});
`;

const outPath = path.join(__dirname, "..", "public", "firebase-messaging-sw.js");
fs.writeFileSync(outPath, sw, "utf-8");
console.log("Generated public/firebase-messaging-sw.js");
