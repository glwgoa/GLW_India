"use client";

import { useCallback, useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendorsGrid } from "./vendors-grid";
import { VendorFormDialog } from "./vendor-form-dialog";
import {
  VENDOR_CATEGORY_SELECTIONS_SELECT,
  groupVendorCategorySelections,
} from "@/lib/vendor-categories";
import type {
  VendorCategoryRow,
  VendorCategorySelection,
  VendorRow,
  VendorSubCategoryRow,
} from "@/types/vendor";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

const PRIORITIES = ["primary", "secondary", "tertiary"] as const;

export function VendorsClient({
  initialVendors,
  categories,
  subCategories,
  initialCategorySelections,
  profile,
}: {
  initialVendors: VendorRow[];
  categories: VendorCategoryRow[];
  subCategories: VendorSubCategoryRow[];
  initialCategorySelections: Record<string, VendorCategorySelection[]>;
  profile: Profile;
}) {
  const [vendors, setVendors] = useState<VendorRow[]>(initialVendors);
  const [categorySelections, setCategorySelections] =
    useState<Record<string, VendorCategorySelection[]>>(initialCategorySelections);
  const [refreshing, setRefreshing] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const canAdd = isPrivileged(profile.role);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const [{ data: vendorData }, { data: selectionData }] = await Promise.all([
      supabase.from("vendors").select("*").order("name"),
      supabase.from("vendor_category_selections").select(VENDOR_CATEGORY_SELECTIONS_SELECT),
    ]);
    if (vendorData) setVendors(vendorData as VendorRow[]);
    if (selectionData) {
      setCategorySelections(
        groupVendorCategorySelections(
          selectionData as unknown as Parameters<typeof groupVendorCategorySelections>[0],
        ),
      );
    }
    setRefreshing(false);
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      if (nameFilter && !vendor.name?.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      if (categoryFilter) {
        const vendorCategories = categorySelections[vendor.id] ?? [];
        if (!vendorCategories.some((s) => s.categoryName === categoryFilter)) return false;
      }
      if (priorityFilter && vendor.priority !== priorityFilter) return false;
      return true;
    });
  }, [vendors, nameFilter, categoryFilter, priorityFilter, categorySelections]);

  const hasFilters = nameFilter || categoryFilter || priorityFilter;

  function clearFilters() {
    setNameFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vendors</h1>
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
          {canAdd && (
            <VendorFormDialog categories={categories} subCategories={subCategories} onSaved={refresh} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="vendor-name-filter" className="text-xs text-muted-foreground">
            Name
          </Label>
          <Input
            id="vendor-name-filter"
            placeholder="Search vendors..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "")}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue>{(value: string) => value || "All categories"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Priority</Label>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "")}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue>{(value: string) => (value ? value : "All priorities")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <div className="space-y-1.5">
            <Label className="invisible text-xs">Clear</Label>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          </div>
        )}
      </div>

      <VendorsGrid
        vendors={filteredVendors}
        setVendors={setVendors}
        profile={profile}
        refresh={refresh}
        categories={categories}
        subCategories={subCategories}
        categorySelections={categorySelections}
      />
    </div>
  );
}
