import { useEffect, useRef } from "react";
import { useFirebaseMessaging } from "../lib/useFirebaseMessaging";

const PROMPT_DELAY_MS = 10000;
const DISMISSED_KEY = "cb-notif-dismissed";

export default function NotificationPrompt() {
  const { permission, requestPermission } = useFirebaseMessaging();
  const prompted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (permission !== "default") return;
    if (prompted.current) return;

    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) return;
    } catch {}

    prompted.current = true;

    const timer = setTimeout(async () => {
      const token = await requestPermission();
      if (!token) {
        try {
          localStorage.setItem(DISMISSED_KEY, "1");
        } catch {}
      }
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [permission, requestPermission]);

  return null;
}
