// DemoContext.jsx — Demo mode state: tier annotations, splash, context preview.
// Stored in localStorage so it persists across navigation within a session.

import { createContext, useContext, useState, useCallback } from "react";

const DemoContext = createContext(null);

const LS_MODE   = "sermonforge_demo_mode";
const LS_SPLASH = "sermonforge_demo_splash_seen";

export function DemoProvider({ children }) {
  const [demoMode, setDemoMode]           = useState(() => localStorage.getItem(LS_MODE) === "1");
  const [demoSplashSeen, setSplashSeen]   = useState(() => localStorage.getItem(LS_SPLASH) === "1");
  const [showSplash, setShowSplash]       = useState(false);

  const enableDemoMode = useCallback(() => {
    localStorage.setItem(LS_MODE, "1");
    setDemoMode(true);
    if (localStorage.getItem(LS_SPLASH) !== "1") {
      setShowSplash(true);
    }
  }, []);

  const disableDemoMode = useCallback(() => {
    localStorage.setItem(LS_MODE, "0");
    setDemoMode(false);
    setShowSplash(false);
  }, []);

  const markSplashSeen = useCallback(() => {
    localStorage.setItem(LS_SPLASH, "1");
    setSplashSeen(true);
    setShowSplash(false);
  }, []);

  const resetDemoSplash = useCallback(() => {
    localStorage.removeItem(LS_SPLASH);
    setSplashSeen(false);
  }, []);

  return (
    <DemoContext.Provider value={{ demoMode, enableDemoMode, disableDemoMode, demoSplashSeen, showSplash, markSplashSeen, resetDemoSplash }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
