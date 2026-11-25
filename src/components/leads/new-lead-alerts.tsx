"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type NewLead = {
  id: string;
  brand: string | null;
  contact_name: string | null;
  phone: string | null;
  source: string | null;
};

/** Short two-note chime; silently does nothing if the browser blocks audio. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.25);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio blocked */
  }
}

/** Toasts (with a chime) for new leads; keeps the Leads page current when leads change or are deleted. */
export function NewLeadAlerts() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Edits and deletions in Kommo arrive in bursts; refresh the Leads page once per burst.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshLeads = () => {
      if (!pathRef.current.startsWith("/leads")) return;
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1500);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("new-kommo-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kommo_leads" },
        (payload) => {
          const lead = payload.new as NewLead;
          const who = lead.contact_name || lead.phone || "Unknown contact";
          const details = [lead.phone && lead.contact_name ? lead.phone : null, lead.source, lead.brand]
            .filter(Boolean)
            .join(" · ");
          const onLeads = pathRef.current.startsWith("/leads");
          toast.success(`New lead: ${who}`, {
            description: details || undefined,
            duration: 10000,
            action: onLeads ? undefined : { label: "View", onClick: () => router.push("/leads") },
          });
          chime();
          if (onLeads) router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kommo_leads" },
        () => refreshLeads(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "kommo_leads" },
        () => refreshLeads(),
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
