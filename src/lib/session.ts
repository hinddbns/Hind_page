import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";
import { workspaceFromCategory } from "@/lib/workspace";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  workspace: "ADOLESCENT" | "PARENT_TEACHER";
  verified: boolean;
};

// The Supabase-Auth equivalent of NextAuth's auth() — always uses getUser()
// (never getSession()) so identity is revalidated against Supabase's servers
// rather than trusted from a client-modifiable cookie payload. Does one
// indexed lookup per call for role/workspace, since Supabase's own
// session JWT only knows about auth identity, not application data — see
// the "Session/authorization flow" tradeoff note in the migration plan.
// Wrapped in React's cache() because both a layout and its page routinely
// call this independently in the same request (e.g. (app)/layout.tsx and
// admin/layout.tsx both gate on it) — without deduping, a 3-level-deep route
// like /admin fires it multiple times per request.
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile, error } = await db
    .from("User")
    .select("name, role, profileCategory")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile.name,
    role: profile.role,
    workspace: workspaceFromCategory(profile.profileCategory),
    verified: authUser.email_confirmed_at != null,
  };
});
