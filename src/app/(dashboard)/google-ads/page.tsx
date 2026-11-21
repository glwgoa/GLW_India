import { Megaphone } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { fetchCampaigns, isGoogleAdsConfigured, type AdCampaign } from "@/lib/google-ads";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { GoogleAdsClient } from "@/components/google-ads/google-ads-client";

export default async function GoogleAdsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, ["admin", "developer", "project_manager"]);

  const connected = isGoogleAdsConfigured();
  let campaigns: AdCampaign[] = [];
  let error: string | null = null;
  if (connected) {
    try {
      campaigns = await fetchCampaigns();
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load Google Ads.";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={Megaphone} color="var(--chart-1)" />
        <div>
          <h1 className="text-2xl font-semibold">Google Ads</h1>
          <p className="text-sm text-muted-foreground">
            Campaign performance for the last 30 days.
            {profile.role !== "developer" && " View only."}
          </p>
        </div>
      </div>
      <GoogleAdsClient
        campaigns={campaigns}
        connected={connected}
        error={error}
        canManage={profile.role === "developer"}
      />
    </div>
  );
}
