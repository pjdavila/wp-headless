import { useState, useEffect, useCallback } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export function useFirebaseMessaging() {
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (permission !== "granted") return;

    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const { title, body, icon } = payload.notification || {};
        if (title && "Notification" in window) {
          new Notification(title, { body, icon });
        }
      });
    } catch {}
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!("Notification" in window)) return null;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          ),
        });
        setFcmToken(token);
        return token;
      }
    } catch (err) {
      console.error("FCM permission error:", err.message);
    }
    return null;
  }, []);

  return { fcmToken, permission, requestPermission };
}
