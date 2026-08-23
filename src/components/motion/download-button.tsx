"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActionStatus } from "@/hooks/use-action-status";

/**
 * Download CSV button that animates its icon through
 * download -> spinner -> checkmark as the export runs.
 */
export function DownloadButton({
  onDownload,
  children = "Download CSV",
}: {
  onDownload: () => void;
  children?: React.ReactNode;
}) {
  const { status, run } = useActionStatus();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={status === "pending"}
      onClick={() => run(() => onDownload())}
    >
      <span className="relative flex size-4 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {status === "idle" && (
            <motion.span
              key="idle"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Download className="size-4" />
            </motion.span>
          )}
          {status === "pending" && (
            <motion.span
              key="pending"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Loader2 className="size-4 animate-spin" />
            </motion.span>
          )}
          {status === "success" && (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center text-emerald-600"
            >
              <Check className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {children}
    </Button>
  );
}
