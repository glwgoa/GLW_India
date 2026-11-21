"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateCampaignBudget, updateCampaignStatus, type AdsActionResult } from "@/lib/actions/google-ads";
import type { AdCampaign } from "@/lib/google-ads";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function GoogleAdsClient({
  campaigns,
  connected,
  error,
  canManage,
}: {
  campaigns: AdCampaign[];
  connected: boolean;
  error: string | null;
  canManage: boolean;
}) {
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
    (t, c) => ({ cost: t.cost + c.cost, clicks: t.clicks + c.clicks, conv: t.conv + c.conversions }),
    { cost: 0, clicks: 0, conv: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Spend", inr(total.cost)],
          ["Clicks", total.clicks.toLocaleString("en-IN")],
          ["Conversions", total.conv.toFixed(1)],
          ["Cost / conversion", total.conv ? inr(total.cost / total.conv) : "-"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Campaign</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Daily budget</th>
                <th className="p-3 text-right">Spend</th>
                <th className="p-3 text-right">Clicks</th>
                <th className="p-3 text-right">Impr.</th>
                <th className="p-3 text-right">Conv.</th>
                {canManage && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={`${c.accountId}-${c.id}`} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.name}<div className="text-xs font-normal text-muted-foreground">{c.accountName}</div></td>
                  <td className="p-3">{c.status === "ENABLED" ? "Enabled" : c.status === "PAUSED" ? "Paused" : c.status}</td>
                  <td className="p-3 text-right">
                    {canManage && editing === c.id ? (
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
                      inr(c.dailyBudget)
                    )}
                  </td>
                  <td className="p-3 text-right">{inr(c.cost)}</td>
                  <td className="p-3 text-right">{c.clicks.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{c.impressions.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right">{c.conversions.toFixed(1)}</td>
                  {canManage && (
                    <td className="space-x-1 p-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          setEditing(c.id);
                          setBudget(String(c.dailyBudget));
                        }}
                      >
                        Edit budget
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending || (c.status !== "ENABLED" && c.status !== "PAUSED")}
                        onClick={() => run(() => updateCampaignStatus(c.accountId, c.id, c.status === "ENABLED" ? "PAUSED" : "ENABLED"))}
                      >
                        {c.status === "ENABLED" ? "Pause" : "Enable"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No campaigns found.
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
