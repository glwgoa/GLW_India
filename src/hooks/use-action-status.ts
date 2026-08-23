"use client";

import { useCallback, useRef, useState } from "react";

export type ActionStatus = "idle" | "pending" | "success";

/**
 * Wraps an async action with idle -> pending -> success -> idle status,
 * for buttons that want to show a spinner then a brief checkmark
 * (Download CSV, Refresh, Save) instead of just a plain onClick.
 */
export function useActionStatus() {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (action: () => void | Promise<void>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("pending");
    try {
      await action();
      setStatus("success");
      timeoutRef.current = setTimeout(() => setStatus("idle"), 1100);
    } catch (err) {
      setStatus("idle");
      throw err;
    }
  }, []);

  return { status, run };
}
