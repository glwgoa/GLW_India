"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { computeSlaHint, formatCountdown } from "@/lib/sla";
import type { BookingStatus, SlaStatus } from "@/types/booking";

const STATUS_VARIANT: Record<SlaStatus, "default" | "secondary" | "destructive" | "outline"> = {
  on_track: "secondary",
  warning: "outline",
  breached: "destructive",
  met: "default",
};

const HINT_LABEL = {
  on_track: null,
  due_soon: "due soon",
  overdue: "overdue",
} as const;

export function SlaBadge({
  deadline,
  status,
  slaStatus,
}: {
  deadline: string;
  status: BookingStatus;
  slaStatus: SlaStatus;
}) {
  const [, setTick] = useState(0);

  // Re-render every 30s so the countdown/hint stay current — purely visual,
  // never writes back to the database (sla_status is set manually by staff).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const hint = computeSlaHint(deadline, status);

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={STATUS_VARIANT[slaStatus]} className="w-fit capitalize">
        {slaStatus.replace("_", " ")}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {formatCountdown(deadline)}
        {HINT_LABEL[hint] && (
          <span className={hint === "overdue" ? "text-destructive" : "text-amber-600"}>
            {" "}
            &middot; {HINT_LABEL[hint]}
          </span>
        )}
      </span>
    </div>
  );
}
