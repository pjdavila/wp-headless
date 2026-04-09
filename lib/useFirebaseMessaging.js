import { useState, useEffect, useCallback, useRef } from "react";
import { app } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

function isFCMSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function useFirebaseMessaging() {
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState("default");
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!isFCMSupported()) return;
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!isFCMSupported()) return;
    if (permission !== "granted") return;

    let cancelled = false;

    (async () => {
      try {
        const { getMessaging, onMessage } = await import("firebase/messaging");
        const messaging = getMessaging(app);
        const unsub = onMessage(messaging, (payload) => {
          if (cancelled) return;
          const { title, body, icon } = payload.notification || {};
          if (title) {
            new Notification(title, { body, icon });
          }
        });
        unsubRef.current = unsub;
      } catch (err) {
        console.warn("FCM onMessage setup failed:", err.message);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unsubRef.current === "function") {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!isFCMSupported()) return null;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        const { getMessaging, getToken } = await import("firebase/messaging");
        const messaging = getMessaging(app);
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
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
