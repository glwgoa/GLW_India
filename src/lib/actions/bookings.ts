"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { isPrivileged, isStaffRole } from "@/lib/auth/roles";
import { kommoFetch, KommoError } from "@/lib/kommo";
import { phoneDigits } from "@/lib/lead-source";

export type SendConfirmationResult = { error?: string; success?: string; sentAt?: string };

/** Lead field the Salesbot reads the message from. Created in Kommo on first use. */
const CONFIRMATION_FIELD_NAME = "Booking confirmation";

type KommoField = { id: number; name: string };

async function confirmationFieldId(subdomain: string, token: string) {
  for (let page = 1; page <= 5; page++) {
    const res = await kommoFetch<{ _embedded?: { custom_fields?: KommoField[] } }>(
      subdomain,
      token,
      `/leads/custom_fields?limit=250&page=${page}`,
    );
    const fields = res?._embedded?.custom_fields ?? [];
    const found = fields.find((f) => f.name.trim().toLowerCase() === CONFIRMATION_FIELD_NAME.toLowerCase());
    if (found) return found.id;
    if (fields.length < 250) break;
  }
  const created = await kommoFetch<{ _embedded?: { custom_fields?: KommoField[] } }>(
    subdomain,
    token,
    "/leads/custom_fields",
    { method: "POST", body: [{ name: CONFIRMATION_FIELD_NAME, type: "textarea" }] },
  );
  const id = created?._embedded?.custom_fields?.[0]?.id;
  if (!id) throw new Error("Kommo did not return the new field");
  return id;
}

/**
 * Sends the booking confirmation to the customer's WhatsApp through Kommo: writes the text to the
 * lead's "Booking confirmation" field, then launches the Salesbot (KOMMO_CONFIRMATION_BOT_ID)
 * that posts that field into the lead's chat.
 */
export async function sendBookingConfirmation(bookingId: string, text: string): Promise<SendConfirmationResult> {
  try {
    const profile = await getCurrentProfile();
    if (!isPrivileged(profile.role) && !isStaffRole(profile.role) && profile.role !== "project_manager") {
      return { error: "You don't have permission to send confirmations" };
    }
    const message = text.trim();
    if (!message) return { error: "The confirmation is empty" };
    if (message.length > 4000) return { error: "The confirmation is too long for WhatsApp" };

    const subdomain = process.env.KOMMO_SUBDOMAIN;
    const token = process.env.KOMMO_LONG_LIVED_TOKEN;
    const botId = Number(process.env.KOMMO_CONFIRMATION_BOT_ID?.trim().match(/(\d+)\/?$/)?.[1]);
    if (!subdomain || !token) return { error: "Kommo is not connected (missing KOMMO_SUBDOMAIN or token)" };
    if (!botId) return { error: "Set KOMMO_CONFIRMATION_BOT_ID to the Kommo Salesbot that sends confirmations" };

    const supabase = await createClient();
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, customer_contact, lead:kommo_leads(kommo_lead_id)")
      .eq("id", bookingId)
      .single();
    if (bookingError || !booking) return { error: "Booking not found" };

    // The linked lead, else the newest lead with the same phone number.
    const linked = booking.lead as unknown as { kommo_lead_id: number } | null;
    let leadId = linked?.kommo_lead_id ?? null;
    if (!leadId) {
      const digits = phoneDigits(booking.customer_contact);
      if (digits) {
        const { data: lead } = await supabase
          .from("kommo_leads")
          .select("kommo_lead_id")
          .eq("phone_digits", digits)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        leadId = lead?.kommo_lead_id ?? null;
      }
    }
    if (!leadId) return { error: "No Kommo lead found for this customer's phone number" };

    const fieldId = await confirmationFieldId(subdomain, token);
    await kommoFetch(subdomain, token, `/leads/${leadId}`, {
      method: "PATCH",
      body: { custom_fields_values: [{ field_id: fieldId, values: [{ value: message }] }] },
    });
    await kommoFetch(subdomain, token, `/bots/${botId}/run`, {
      method: "POST",
      body: { entity_id: leadId, entity_type: "leads" },
    });

    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ confirmation_sent_at: sentAt, confirmation_sent_by: profile.id })
      .eq("id", bookingId);
    if (updateError) console.error("Could not record confirmation send:", updateError.message);

    revalidatePath("/bookings");
    return { success: "Confirmation sent to the customer's WhatsApp", sentAt };
  } catch (e) {
    if (e instanceof KommoError) {
      console.error(e.message);
      if (e.status === 401) return { error: "Kommo rejected the token. Check KOMMO_LONG_LIVED_TOKEN" };
      const isBot = e.path.startsWith("/bots/");
      if (isBot && e.status === 404) return { error: "Kommo could not find the Salesbot. Check KOMMO_CONFIRMATION_BOT_ID" };
      if (e.status === 403 || e.status === 404) return { error: "Kommo lead not found or no access to it" };
      return { error: `Kommo error (${e.status})` };
    }
    console.error(e);
    return { error: "Could not send the confirmation" };
  }
}
