import { createBrowserClient } from "@supabase/ssr";

// Single choke point for the browser-side Supabase client, used only for
// Auth calls (signUp, signInWithPassword, verifyOtp, resend, resetPassword,
// updateUser) — this app never queries Postgres directly from the browser,
// so the anon key here never touches application data, only auth.users.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
