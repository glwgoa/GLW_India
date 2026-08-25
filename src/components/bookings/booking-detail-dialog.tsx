"use client";

import { Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BookingRow } from "@/types/booking";

export function BookingDetailDialog({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingRow;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{booking.customer_name}</DialogTitle>
          <DialogDescription>
            {new Date(booking.booking_date).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Region</span>
            <span className="font-medium">{booking.region?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Vendor</span>
            <span className="font-medium">{booking.vendor?.name ?? "Unassigned"}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline">
            <Copy />
            Copy confirmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
