"use client";

import { toast } from "sonner";
import { Mail, Phone, Trash2, MapPin, Landmark, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorFormDialog } from "./vendor-form-dialog";
import type { VendorRow } from "@/types/vendor";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

const PRIORITY_VARIANT: Record<string, "destructive" | "outline" | "secondary"> = {
  primary: "destructive",
  secondary: "outline",
  tertiary: "secondary",
};

export function VendorsGrid({
  vendors,
  setVendors,
  profile,
  refresh,
}: {
  vendors: VendorRow[];
  setVendors: React.Dispatch<React.SetStateAction<VendorRow[]>>;
  profile: Profile;
  refresh: () => void | Promise<void>;
}) {
  function canEdit(vendor: VendorRow) {
    if (isPrivileged(profile.role)) return true;
    if (profile.role === "vendor") return vendor.id === profile.vendor_id;
    return false;
  }

  // Payment/banking details are sensitive — only shown to admin or the
  // vendor themselves, even though PMs can otherwise read the vendor row.
  function canSeePayment(vendor: VendorRow) {
    return canEdit(vendor);
  }

  const canDelete = isPrivileged(profile.role);

  async function deleteVendor(vendor: VendorRow) {
    if (
      !window.confirm(
        `Delete ${vendor.name ?? "this vendor"}? Bookings/projects previously assigned to them will show as unassigned. This cannot be undone.`,
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("vendors").delete().eq("id", vendor.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
    toast.success("Vendor deleted");
  }

  if (vendors.length === 0) {
    return <p className="text-sm text-muted-foreground">No vendors to show.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vendors.map((vendor) => {
        const location = [vendor.city, vendor.location].filter(Boolean).join(", ");

        return (
          <Card key={vendor.id}>
            <CardHeader className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{vendor.name ?? "Unnamed vendor"}</CardTitle>
                {vendor.category && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="size-3" />
                    {vendor.category}
                  </p>
                )}
              </div>
              {vendor.priority && (
                <Badge variant={PRIORITY_VARIANT[vendor.priority] ?? "outline"} className="capitalize">
                  {vendor.priority}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              {vendor.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{vendor.contact_email}</span>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{vendor.contact_phone}</span>
                </div>
              )}
              {vendor.additional_contact_number && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{vendor.additional_contact_number} (alt)</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>{location}</span>
                </div>
              )}
              {canSeePayment(vendor) &&
                (vendor.bank_account_number || vendor.upi_id || vendor.payment_terms) && (
                  <div className="space-y-1 border-t pt-2">
                    <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                      <Landmark className="size-3" />
                      Payment details
                    </p>
                    {vendor.bank_account_name && <p>Account: {vendor.bank_account_name}</p>}
                    {vendor.bank_account_number && <p>A/C no: {vendor.bank_account_number}</p>}
                    {vendor.ifsc_code && <p>IFSC: {vendor.ifsc_code}</p>}
                    {vendor.upi_id && <p>UPI: {vendor.upi_id}</p>}
                    {vendor.payment_terms && <p>Terms: {vendor.payment_terms}</p>}
                  </div>
                )}
            </CardContent>
            {(canEdit(vendor) || canDelete) && (
              <CardFooter className="gap-2 border-t pt-3">
                {canEdit(vendor) && <VendorFormDialog vendor={vendor} onSaved={refresh} />}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Delete vendor"
                    onClick={() => deleteVendor(vendor)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}
