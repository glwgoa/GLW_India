"use client";

import { useRegion } from "@/lib/region-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RegionSwitcher({
  regions,
  canViewAll,
}: {
  regions: { id: string; name: string }[];
  canViewAll: boolean;
}) {
  const { selectedRegionId, setSelectedRegionId } = useRegion();

  return (
    <Select
      value={selectedRegionId}
      onValueChange={(value) => setSelectedRegionId(value ?? "all")}
    >
      <SelectTrigger className="w-32 sm:w-44">
        <SelectValue>
          {(value: string) =>
            value === "all" ? "All Regions" : (regions.find((r) => r.id === value)?.name ?? value)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {canViewAll && <SelectItem value="all">All Regions</SelectItem>}
        {regions.map((region) => (
          <SelectItem key={region.id} value={region.id}>
            {region.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
