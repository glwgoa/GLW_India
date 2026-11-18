/** Evening slot starts at 3:30 PM; anything earlier uses the Morning rates. */
export const EVENING_START = "15:30";

export type YachtPackage = { sailing: number; anchorage: number };

/** Sailing/anchorage hour packages for Private Yacht bookings. 1.5 = 1 hour 30 min. */
export const YACHT_PACKAGES: YachtPackage[] = [
  { sailing: 0.5, anchorage: 0.5 },
  { sailing: 1, anchorage: 1 },
  { sailing: 1.5, anchorage: 1.5 },
  { sailing: 2, anchorage: 1 },
  { sailing: 2, anchorage: 2 },
  { sailing: 2.5, anchorage: 2.5 },
  { sailing: 3, anchorage: 1 },
  { sailing: 3, anchorage: 3 },
  { sailing: 4, anchorage: 4 },
  { sailing: 1, anchorage: 0 },
  { sailing: 2, anchorage: 0 },
  { sailing: 3, anchorage: 0 },
];

export function packageKey(p: YachtPackage) {
  return `${p.sailing}-${p.anchorage}`;
}

export function parsePackageKey(key: string): YachtPackage | null {
  const [s, a] = key.split("-").map(Number);
  return Number.isFinite(s) && Number.isFinite(a) ? { sailing: s, anchorage: a } : null;
}

export function packageLabel(p: YachtPackage) {
  return p.anchorage > 0
    ? `${p.sailing}h sailing + ${p.anchorage}h anchor`
    : `${p.sailing}h sailing`;
}

export function isEveningStart(startTime: string) {
  return startTime >= EVENING_START;
}

type YachtRates = {
  sailing_price?: number | null;
  anchorage_price?: number | null;
  morning_sailing_price?: number | null;
  morning_anchorage_price?: number | null;
};

/**
 * B2B for a yacht booking = sailing rate x sailing hours + anchorage rate x
 * anchorage hours, using the Evening rates for starts at/after 3:30 PM and the
 * Morning rates otherwise. If the yacht has only one slot's rates, that slot's
 * rates are used for both. A missing anchorage rate counts as 0; an error is
 * returned only when the yacht has no sailing rate at all.
 */
export function computeYachtB2b(
  rates: YachtRates | undefined,
  startTime: string,
  pkg: YachtPackage,
): { b2b: number } | { error: string } {
  const evening = isEveningStart(startTime);
  const eveningRates = { sailing: rates?.sailing_price, anchorage: rates?.anchorage_price };
  const morningRates = {
    sailing: rates?.morning_sailing_price,
    anchorage: rates?.morning_anchorage_price,
  };
  const [own, other] = evening ? [eveningRates, morningRates] : [morningRates, eveningRates];
  const used = own.sailing != null ? own : other;
  if (used.sailing == null) {
    return { error: "No Evening or Morning rate set for this yacht in Inventory" };
  }
  return { b2b: used.sailing * pkg.sailing + (used.anchorage ?? 0) * pkg.anchorage };
}
