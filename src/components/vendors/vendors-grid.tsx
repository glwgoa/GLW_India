"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorFormDialog } from "./vendor-form-dialog";
import { VendorDetailDialog } from "./vendor-detail-dialog";
import type {
  VendorCategoryRow,
  VendorCategorySelection,
  VendorRow,
  VendorSubCategoryRow,
} from "@/types/vendor";
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
  categorySelections,
}: {
  vendors: VendorRow[];
  setVendors: React.Dispatch<React.SetStateAction<VendorRow[]>>;
  profile: Profile;
  refresh: () => void | Promise<void>;
  categories: VendorCategoryRow[];
  subCategories: VendorSubCategoryRow[];
  categorySelections: Record<string, VendorCategorySelection[]>;
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
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const vendorCategories = categorySelections[vendor.id] ?? [];

              return (
                <TableRow
                  key={vendor.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <TableCell className="font-medium">{vendor.name ?? "Unnamed vendor"}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    {vendorCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {vendorCategories.map((s) => (
                          <Badge key={s.categoryId} variant="secondary" className="font-normal">
                            {s.categoryName}
                            {s.subCategoryName && ` · ${s.subCategoryName}`}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {vendor.contact_phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0" />
                        {vendor.contact_phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {vendor.priority ? (
                      <Badge variant={PRIORITY_VARIANT[vendor.priority] ?? "outline"} className="capitalize">
                        {vendor.priority}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(canEdit(vendor) || canDelete) && (
                      <div className="flex justify-end gap-2">
                        {canEdit(vendor) && (
                          <VendorFormDialog
                            vendor={vendor}
                            categories={categories}
                            subCategories={subCategories}
                            categorySelections={vendorCategories}
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
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedVendor && (
        <VendorDetailDialog
          open={!!selectedVendor}
          onOpenChange={(o) => !o && setSelectedVendor(null)}
          vendor={selectedVendor}
          categorySelections={categorySelections[selectedVendor.id] ?? []}
          canSeePayment={canSeePayment(selectedVendor)}
        />
      )}
    </>
  );
}
