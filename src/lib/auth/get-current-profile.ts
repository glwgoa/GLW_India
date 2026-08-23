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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  return profile;
});
