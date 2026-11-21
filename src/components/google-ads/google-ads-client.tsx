"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateCampaignBudget, updateCampaignStatus, type AdsActionResult } from "@/lib/actions/google-ads";
import type { AdCampaign } from "@/lib/google-ads";
import { AD_RANGES } from "@/lib/ads-range";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function GoogleAdsClient({
  campaigns,
  connected,
  error,
  range,
  canManage,
}: {
  campaigns: AdCampaign[];
  connected: boolean;
  error: string | null;
  range: { key: string; start: string; end: string };
  canManage: boolean;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(range.start);
  const [to, setTo] = useState(range.end);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [budget, setBudget] = useState("");

  function run(fn: () => Promise<AdsActionResult>) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "Done.");
      setEditing(null);
    });
  }

  if (!connected) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Google Ads is not connected yet. Add the Google Ads credentials to the server environment to see campaigns here.
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  const total = campaigns.reduce(
    (t, c) => ({
      cost: t.cost + c.cost,
      clicks: t.clicks + c.clicks,
      impr: t.impr + c.impressions,
      conv: t.conv + c.conversions,
    }),
    { cost: 0, clicks: 0, impr: 0, conv: 0 },
  );
  const ctr = total.impr ? (total.clicks / total.impr) * 100 : 0;
  const cpc = total.clicks ? total.cost / total.clicks : 0;

  const go = (key: string, f?: string, t?: string) =>
    router.push(key === "custom" ? `/google-ads?range=custom&from=${f}&to=${t}` : `/google-ads?range=${key}`);

  const cards: [string, string, string][] = [
    ["Cost", inr(total.cost), "#1a73e8"],
    ["Clicks", total.clicks.toLocaleString("en-IN"), "#ea4335"],
    ["Impressions", total.impr.toLocaleString("en-IN"), "#fbbc04"],
    ["Avg. CPC", cpc ? inr(cpc) : "-", "#34a853"],
    ["CTR", `${ctr.toFixed(2)}%`, "#9334e6"],
    ["Conversions", total.conv.toFixed(1), "#12b5cb"],
    ["Cost / conv.", total.conv ? inr(total.cost / total.conv) : "-", "#e8710a"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-medium text-[#137333] dark:bg-[#137333]/25 dark:text-[#81c995]">
          <span className="size-2 rounded-full bg-[#34a853]" /> Enabled campaigns
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={range.key}
            onChange={(e) => go(e.target.value, from, to)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {AD_RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          {range.key === "custom" && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
              <Button size="sm" disabled={!from || !to || from > to} onClick={() => go("custom", from, to)}>
                Apply
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map(([label, value, color]) => (
          <div key={label} className="overflow-hidden rounded-lg border bg-card" style={{ borderTop: `3px solid ${color}` }}>
            <div className="px-3 py-2.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-normal tracking-tight">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="p-3">Campaign</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Budget</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3 text-right">Clicks</th>
                <th className="p-3 text-right">Impr.</th>
                <th className="p-3 text-right">CTR</th>
                <th className="p-3 text-right">Avg. CPC</th>
                <th className="p-3 text-right">Conv.</th>
                {canManage && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={`${c.accountId}-${c.id}`} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium text-[#1a73e8] dark:text-[#8ab4f8]">
                    {c.name}
                    <div className="text-xs font-normal text-muted-foreground">{c.accountName}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#34a853]" /> Enabled
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {canManage && editing === `${c.accountId}-${c.id}` ? (
                      <span className="inline-flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="h-8 w-24"
                        />
                        <Button size="sm" disabled={pending} onClick={() => run(() => updateCampaignBudget(c.accountId, c.budgetId, Number(budget)))}>
                          Save
                        </Button>
                      </span>
                    ) : (
                      <>
                        {inr(c.dailyBudget)}
                        <span className="text-xs text-muted-foreground">/day</span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-right">{inr(c.cost)}</td>
                  <td className="p-3 text-right">{c.clicks.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{c.impressions.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{c.impressions ? `${((c.clicks / c.impressions) * 100).toFixed(2)}%` : "-"}</td>
                  <td className="p-3 text-right">{c.clicks ? inr(c.cost / c.clicks) : "-"}</td>
                  <td className="p-3 text-right">{c.conversions.toFixed(1)}</td>
                  {canManage && (
                    <td className="space-x-1 p-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          setEditing(`${c.accountId}-${c.id}`);
                          setBudget(String(c.dailyBudget));
                        }}
                      >
                        Edit budget
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => updateCampaignStatus(c.accountId, c.id, "PAUSED"))}
                      >
                        Pause
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {campaigns.length > 0 && (
                <tr className="bg-muted/40 font-medium">
                  <td className="p-3" colSpan={3}>
                    Total: {campaigns.length} enabled campaigns
                  </td>
                  <td className="p-3 text-right">{inr(total.cost)}</td>
                  <td className="p-3 text-right">{total.clicks.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{total.impr.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{ctr.toFixed(2)}%</td>
                  <td className="p-3 text-right">{cpc ? inr(cpc) : "-"}</td>
                  <td className="p-3 text-right">{total.conv.toFixed(1)}</td>
                  {canManage && <td />}
                </tr>
              )}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted-foreground">
                    No running campaigns for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
