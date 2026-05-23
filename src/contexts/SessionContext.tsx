"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Session {
  token: string;
  name: string;
  familyId: string;
  role: "admin" | "member" | "consultor";
}

interface SessionContextValue {
  session: Session | null;
  setSession: (s: Session | null) => void;
  token: string; // "" se não logado
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => {},
  token: "",
});

const STORAGE_KEY = "mcmv_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSessionState(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  function setSession(s: Session | null) {
    setSessionState(s);
    if (s) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  if (!loaded) return null; // evita flash de conteúdo

  return (
    <SessionContext.Provider value={{ session, setSession, token: session?.token ?? "" }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export function useSessionToken() {
  return useContext(SessionContext).token;
}
