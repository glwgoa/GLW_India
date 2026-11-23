import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { LeadsClient, type LeadListRow, type LeadBooking } from "@/components/leads/leads-client";

const PAGE = 1000; // Supabase returns at most 1000 rows per request.

/** Every lead, newest first, fetched 1000 at a time. */
async function allLeads(supabase: Awaited<ReturnType<typeof createClient>>) {
  const leads: LeadListRow[] = [];
  for (let start = 0; start < 50_000; start += PAGE) {
    const { data, error } = await supabase
      .from("kommo_leads")
      .select(
        "id, kommo_lead_id, brand, contact_name, phone, phone_digits, source, utm_source, utm_medium, utm_campaign, gclid, status, lead_created_at, created_at",
      )
      .order("lead_created_at", { ascending: false, nullsFirst: false })
      .order("id")
      .range(start, start + PAGE - 1);
    if (error) return { leads, error };
    leads.push(...((data ?? []) as LeadListRow[]));
    if (!data || data.length < PAGE) break;
  }
  return { leads, error: null };
}

export default async function LeadsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, ["admin", "developer", "project_manager", "employee", "accountant"]);

  const supabase = await createClient();
  const [{ leads, error }, { data: bookings }] = await Promise.all([
    allLeads(supabase),
    supabase
      .from("bookings")
      .select("id, kommo_lead_id, customer_name, customer_contact, booking_date, sale_price, status")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={Inbox} color="var(--chart-2)" />
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">Enquiries from Kommo, and whether they turned into bookings.</p>
        </div>
      </div>
      <LeadsClient
        leads={leads}
        bookings={(bookings ?? []) as LeadBooking[]}
        error={error?.message ?? null}
      />
    </div>
  );
}
