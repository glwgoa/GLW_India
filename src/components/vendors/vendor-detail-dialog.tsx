"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Building2, Landmark, Mail, MapPin, Phone, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { VendorRow } from "@/types/vendor";

const PRIORITY_VARIANT: Record<string, "destructive" | "outline" | "secondary"> = {
  primary: "destructive",
  secondary: "outline",
  tertiary: "secondary",
};

const childVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 400, damping: 28, mass: 0.6 },
  },
};

export function VendorDetailDialog({
  open,
  onOpenChange,
  vendor,
  canSeePayment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorRow;
  canSeePayment: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = !shouldReduceMotion;
  const location = [vendor.city, vendor.location].filter(Boolean).join(", ");
  const hasPayment = vendor.bank_account_number || vendor.upi_id || vendor.payment_terms;
  const hasContact = vendor.contact_email || vendor.contact_phone || vendor.additional_contact_number || location;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <div className="relative flex h-28 w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
          <Building2 className="h-10 w-10 text-primary/40" />
          {vendor.priority && (
            <div className="absolute top-4 right-12">
              <Badge variant={PRIORITY_VARIANT[vendor.priority] ?? "outline"} className="capitalize">
                {vendor.priority}
              </Badge>
            </div>
          )}
        </div>

        <div className="space-y-4 p-6">
          <motion.div
            initial={shouldAnimate ? "hidden" : "visible"}
            animate="visible"
            variants={shouldAnimate ? childVariants : undefined}
            className="space-y-1"
          >
            <DialogTitle className="text-xl leading-tight font-bold tracking-tight">
              {vendor.name ?? "Unnamed vendor"}
            </DialogTitle>
            {vendor.category && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Tag className="size-4 shrink-0" />
                <span>
                  {vendor.category}
                  {vendor.sub_category && ` · ${vendor.sub_category}`}
                </span>
              </div>
            )}
          </motion.div>

          {hasContact && (
            <motion.div
              initial={shouldAnimate ? "hidden" : "visible"}
              animate="visible"
              variants={shouldAnimate ? childVariants : undefined}
              className="space-y-1.5 text-sm text-muted-foreground"
            >
              {vendor.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{vendor.contact_email}</span>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <span>{vendor.contact_phone}</span>
                </div>
              )}
              {vendor.additional_contact_number && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0" />
                  <span>{vendor.additional_contact_number} (alt)</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  <span>{location}</span>
                </div>
              )}
            </motion.div>
          )}

          {canSeePayment && hasPayment && (
            <motion.div
              initial={shouldAnimate ? "hidden" : "visible"}
              animate="visible"
              variants={shouldAnimate ? childVariants : undefined}
              className="space-y-1 rounded-xl border border-border/30 bg-muted/50 p-3 text-sm"
            >
              <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                <Landmark className="size-3.5" />
                Payment details
              </p>
              {vendor.bank_account_name && <p>Account: {vendor.bank_account_name}</p>}
              {vendor.bank_account_number && <p>A/C no: {vendor.bank_account_number}</p>}
              {vendor.ifsc_code && <p>IFSC: {vendor.ifsc_code}</p>}
              {vendor.upi_id && <p>UPI: {vendor.upi_id}</p>}
              {vendor.payment_terms && <p>Terms: {vendor.payment_terms}</p>}
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
