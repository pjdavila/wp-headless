import { createContext, useContext } from "react";
import { auth, db } from "../lib/firebase";

const FirebaseContext = createContext({ auth: null, db: null });

export function FirebaseProvider({ children }) {
  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
