"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { VendorsGrid } from "./vendors-grid";
import { VendorFormDialog } from "./vendor-form-dialog";
import { HyperText } from "@/components/ui/hyper-text";
import type { VendorRow } from "@/types/vendor";
import type { Profile } from "@/types/profile";

export function VendorsClient({
  initialVendors,
  profile,
}: {
  initialVendors: VendorRow[];
  profile: Profile;
}) {
  const [vendors, setVendors] = useState<VendorRow[]>(initialVendors);
  const [refreshing, setRefreshing] = useState(false);
  const canAdd = profile.role === "admin";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase.from("vendors").select("*").order("name");
    if (data) setVendors(data as VendorRow[]);
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <HyperText as="h1" className="text-2xl font-semibold">Vendors</HyperText>
          <p className="text-sm text-muted-foreground">
            {profile.role === "vendor"
              ? "Your vendor profile."
              : "Vendor directory used across bookings, projects, and inventory."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          {canAdd && <VendorFormDialog onSaved={refresh} />}
        </div>
      </div>
      <VendorsGrid vendors={vendors} setVendors={setVendors} profile={profile} refresh={refresh} />
    </div>
  );
}
