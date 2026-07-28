"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AutoLogout() {
  const pathname = usePathname();

  useEffect(() => {
    // We don't want to run the logout timer if they are already on the login page
    if (pathname === "/login" || pathname === "/") return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set timer for 15 minutes (15 mins * 60 secs * 1000 ms)
      timeoutId = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 15 * 60 * 1000); 
    };

    // Listen for any of these interactions to reset the 15-minute clock
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach((event) => document.addEventListener(event, resetTimer));

    // Start the timer immediately when they load a page
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [pathname]);

  return null; // This component is invisible!
}