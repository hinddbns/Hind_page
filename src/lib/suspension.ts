import { db } from "@/lib/supabase/db";

// "Suspending" an account = banning it in Supabase Auth (auth.users.banned_until
// set to the future) via the server-only service-role client. Nothing in
// public.User, enrollments, progress, messages or uploads is touched, so an
// unsuspend restores the exact same account (same Auth id) with all its data.
//
// `updateUserById({ ban_duration })` is the supported mechanism. "876000h"
// (~100 years) is the value the installed @supabase/auth-js documents for an
// indefinite ban; "none" clears it (the SDK types `ban_duration` as
// `string | 'none'`).
//
// No extra app-side session gate is required: this project's GoTrue rejects a
// banned user's existing access token immediately (`GET /auth/v1/user` ->
// 403 user_banned), so `supabase.auth.getUser()` in `getAppUser()` and in the
// proxy middleware both see a suspended account as logged out on its very next
// request, and a fresh login is refused with "User is banned". Verified against
// this project's Supabase on 2026-08-28.
export const SUSPEND_BAN_DURATION = "876000h";
export const RESTORE_BAN_DURATION = "none" as const;

function isBannedNow(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const until = new Date(bannedUntil).getTime();
  return Number.isFinite(until) && until > Date.now();
}

/** Whether a single Auth account is currently suspended. */
export async function isAccountSuspended(authUserId: string): Promise<boolean> {
  const { data, error } = await db.auth.admin.getUserById(authUserId);
  if (error) throw error;
  return isBannedNow(data.user?.banned_until);
}

/** Ids of every currently-suspended Auth user, in one paginated sweep. */
export async function getSuspendedUserIds(): Promise<Set<string>> {
  const suspended = new Set<string>();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      if (isBannedNow(user.banned_until)) suspended.add(user.id);
    }
    if (data.users.length < perPage) break;
  }
  return suspended;
}
