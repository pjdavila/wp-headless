importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSy_placeholder",
  authDomain: "caribbean-business.firebaseapp.com",
  projectId: "caribbean-business",
  storageBucket: "caribbean-business.firebasestorage.app",
  messagingSenderId: "773828226262",
  appId: "1:773828226262:web:559b3b5b48abb26f382d77",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const { title, body, icon } = payload.notification || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body: body || "",
    icon: icon || "/favicon.ico",
  });
});
