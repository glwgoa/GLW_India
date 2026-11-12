import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

/**
 * Every dashboard layout/page independently re-fetches the current user +
 * profile, which used to mean 2 extra sequential Supabase round-trips on
 * every navigation on top of the identical fetch the layout already made
 * in the same request. React.cache() dedupes calls within a single render
 * pass, so the layout and page share one fetch instead of doing it twice.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();

  // getClaims verifies the JWT locally (no Auth-server round trip) when the
  // project uses asymmetric signing keys, and falls back to getUser otherwise.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) redirect("/login");

  return profile;
});
