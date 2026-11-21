"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { setBudgetAmount, setCampaignStatus } from "@/lib/google-ads";

export type AdsActionResult = { error?: string; success?: string };

// Only the developer role may change anything in Google Ads — enforced here
// on the server, not just by hiding buttons.
async function assertDeveloper() {
  const profile = await getCurrentProfile();
  if (profile.role !== "developer") throw new Error("Only the developer can change Google Ads.");
}

export async function updateCampaignStatus(accountId: string, campaignId: string, status: "ENABLED" | "PAUSED"): Promise<AdsActionResult> {
  try {
    await assertDeveloper();
    if (!/^\d+$/.test(accountId) || !/^\d+$/.test(campaignId) || (status !== "ENABLED" && status !== "PAUSED")) throw new Error("Invalid request.");
    await setCampaignStatus(accountId, campaignId, status);
    revalidatePath("/google-ads");
    return { success: status === "PAUSED" ? "Campaign paused." : "Campaign enabled." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateCampaignBudget(accountId: string, budgetId: string, dailyAmount: number): Promise<AdsActionResult> {
  try {
    await assertDeveloper();
    if (!/^\d+$/.test(accountId) || !/^\d+$/.test(budgetId) || !Number.isFinite(dailyAmount) || dailyAmount <= 0) throw new Error("Invalid request.");
    await setBudgetAmount(accountId, budgetId, dailyAmount);
    revalidatePath("/google-ads");
    return { success: "Daily budget updated." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
