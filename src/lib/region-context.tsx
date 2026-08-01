"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type RegionContextValue = {
  selectedRegionId: string | "all";
  setSelectedRegionId: (regionId: string | "all") => void;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({
  children,
  initialRegionId,
}: {
  children: ReactNode;
  initialRegionId: string | "all";
}) {
  const [selectedRegionId, setSelectedRegionIdState] = useState<string | "all">(
    initialRegionId,
  );

  function setSelectedRegionId(regionId: string | "all") {
    setSelectedRegionIdState(regionId);
    document.cookie = `selected_region_id=${regionId}; path=/; max-age=31536000`;
  }

  return (
    <RegionContext.Provider value={{ selectedRegionId, setSelectedRegionId }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within a RegionProvider");
  return ctx;
}
