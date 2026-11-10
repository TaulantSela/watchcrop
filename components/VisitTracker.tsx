"use client";

import { useEffect } from "react";
import { sessionTouch } from "@/lib/attribution";

const SENT_KEY = "watchcrop:visit-sent";

/**
 * Counts one visit per browser session (the conversion-rate denominator).
 * No cookies and nothing personal is sent: the path, campaign tags and the
 * referring host. Admin pages don't count.
 */
export function VisitTracker() {
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem(SENT_KEY)) return;
      sessionStorage.setItem(SENT_KEY, "1");
    } catch {
      return; // no session storage: skip rather than count every page load
    }
    // Capture the touch on the landing page load, before any navigation.
    const body = JSON.stringify({ path: location.pathname, ...sessionTouch() });
    const sent = navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }));
    if (!sent) {
      fetch("/api/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);
  return null;
}
