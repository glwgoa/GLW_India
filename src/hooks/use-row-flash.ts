"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tracks which row id was just updated so the table can flash its
 * background briefly as a "saved" confirmation.
 */
export function useRowFlash() {
  const [flashId, setFlashId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((id: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFlashId(id);
    timeoutRef.current = setTimeout(() => setFlashId(null), 900);
  }, []);

  return { flashId, flash };
}
