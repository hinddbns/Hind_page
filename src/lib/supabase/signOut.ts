"use client";

import { createClient } from "@/lib/supabase/client";

// Full page navigation (not router.push) so the entire Server Component
// tree re-fetches with the now-cleared session, matching the previous
// NextAuth signOut({ callbackUrl }) behavior.
export async function signOutAndRedirect(callbackUrl = "/") {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = callbackUrl;
}
