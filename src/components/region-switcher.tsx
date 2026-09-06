"use client";

import { MapPin } from "lucide-react";
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
    <div className="flex items-center gap-2">
      <MapPin className="size-4 shrink-0 text-neutral-400" />
      <div className="flex flex-col leading-none">
        <span className="hidden text-[10px] font-medium text-neutral-400 sm:inline">Region</span>
        <Select
          value={selectedRegionId}
          onValueChange={(value) => setSelectedRegionId(value ?? "all")}
        >
          <SelectTrigger className="h-auto w-20 border-none bg-transparent p-0 font-semibold text-neutral-900 shadow-none sm:w-36 dark:bg-transparent">
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
      </div>
    </div>
  );
}
