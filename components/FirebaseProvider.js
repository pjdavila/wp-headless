import { createContext, useContext, useState, useEffect } from "react";
import { auth, db, getMessagingInstance } from "../lib/firebase";

const FirebaseContext = createContext({ auth: null, db: null, messaging: null });

export function FirebaseProvider({ children }) {
  const [messaging, setMessaging] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const check = () => {
      const m = getMessagingInstance();
      if (m) {
        if (!cancelled) setMessaging(m);
      } else if (!cancelled) {
        timer = setTimeout(check, 500);
      }
    };
    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ auth, db, messaging }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
