import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !isPrivileged(profile.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY — add it to the environment and redeploy." },
      { status: 500 },
    );
  }

  const { id } = (await request.json()) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const { data: target } = await supabase.from("profiles").select("role").eq("id", id).single();
  if (!target) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  if (target.role === "developer" && profile.role !== "developer") {
    return NextResponse.json({ error: "Only a developer can remove a developer" }, { status: 403 });
  }

  const admin = createServiceRoleClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Deleting the auth user cascades to their profile row.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
