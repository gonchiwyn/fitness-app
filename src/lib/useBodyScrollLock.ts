"use client";

import { useEffect } from "react";

/**
 * Locks body scroll while a modal is open. Restores previous overflow on unmount.
 * Also preserves scroll position (some browsers reset on overflow change).
 */
export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
