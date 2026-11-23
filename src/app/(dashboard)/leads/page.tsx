import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { LeadsClient, type LeadListRow, type LeadBooking } from "@/components/leads/leads-client";

export default async function LeadsPage() {
  const profile = await getCurrentProfile();
  requireRole(profile, ["admin", "developer", "project_manager", "employee", "accountant"]);

  const supabase = await createClient();
  const [{ data: leads, error }, { data: bookings }] = await Promise.all([
    supabase
      .from("kommo_leads")
      .select(
        "id, kommo_lead_id, brand, contact_name, phone, phone_digits, source, utm_source, utm_medium, utm_campaign, gclid, status, lead_created_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(2000),
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
        leads={(leads ?? []) as LeadListRow[]}
        bookings={(bookings ?? []) as LeadBooking[]}
        error={error?.message ?? null}
      />
    </div>
  );
}
