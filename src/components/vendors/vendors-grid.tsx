"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone, Trash2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorFormDialog } from "./vendor-form-dialog";
import { VendorDetailDialog } from "./vendor-detail-dialog";
import type { VendorCategoryRow, VendorRow, VendorSubCategoryRow } from "@/types/vendor";
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
  categories,
  subCategories,
}: {
  vendors: VendorRow[];
  setVendors: React.Dispatch<React.SetStateAction<VendorRow[]>>;
  profile: Profile;
  refresh: () => void | Promise<void>;
  categories: VendorCategoryRow[];
  subCategories: VendorSubCategoryRow[];
}) {
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);

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
        return (
          <Card
            key={vendor.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedVendor(vendor)}
          >
            <CardHeader className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{vendor.name ?? "Unnamed vendor"}</CardTitle>
                {vendor.category && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="size-3" />
                    {vendor.category}
                    {vendor.sub_category && ` · ${vendor.sub_category}`}
                  </p>
                )}
              </div>
              {vendor.priority && (
                <Badge variant={PRIORITY_VARIANT[vendor.priority] ?? "outline"} className="capitalize">
                  {vendor.priority}
                </Badge>
              )}
            </CardHeader>
            {vendor.contact_phone && (
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{vendor.contact_phone}</span>
                </div>
              </CardContent>
            )}
            {(canEdit(vendor) || canDelete) && (
              <CardFooter className="gap-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                {canEdit(vendor) && (
                  <VendorFormDialog
                    vendor={vendor}
                    categories={categories}
                    subCategories={subCategories}
                    onSaved={refresh}
                  />
                )}
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

      {selectedVendor && (
        <VendorDetailDialog
          open={!!selectedVendor}
          onOpenChange={(o) => !o && setSelectedVendor(null)}
          vendor={selectedVendor}
          canSeePayment={canSeePayment(selectedVendor)}
        />
      )}
    </div>
  );
}
