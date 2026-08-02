"use client";

import { toast } from "sonner";
import { Mail, Phone, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorFormDialog } from "./vendor-form-dialog";
import type { VendorRow } from "@/types/vendor";
import type { Profile } from "@/types/profile";

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
    if (profile.role === "admin") return true;
    if (profile.role === "vendor") return vendor.id === profile.vendor_id;
    return false;
  }

  const canDelete = profile.role === "admin";

  async function deleteVendor(vendor: VendorRow) {
    if (
      !window.confirm(
        `Delete ${vendor.name}? Bookings/projects previously assigned to them will show as unassigned. This cannot be undone.`,
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
      {vendors.map((vendor) => (
        <Card key={vendor.id}>
          <CardHeader className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{vendor.name}</CardTitle>
            {vendor.rating != null && (
              <Badge variant="secondary" className="gap-1">
                <Star className="size-3 fill-current" />
                {vendor.rating.toFixed(1)}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{vendor.contact_email}</span>
            </div>
            {vendor.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0" />
                <span>{vendor.contact_phone}</span>
              </div>
            )}
          </CardContent>
          {(canEdit(vendor) || canDelete) && (
            <CardFooter className="gap-2 border-t pt-3">
              {canEdit(vendor) && <VendorFormDialog vendor={vendor} onSaved={refresh} />}
              {canDelete && (
                <Button variant="outline" size="icon-sm" aria-label="Delete vendor" onClick={() => deleteVendor(vendor)}>
                  <Trash2 />
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
