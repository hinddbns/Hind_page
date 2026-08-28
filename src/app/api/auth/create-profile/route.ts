import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/db";

const VALID_CATEGORIES = new Set(["MOTHER", "TEACHER", "ADOLESCENT", "OTHER"]);

// Creates the application-profile (`User`) row once a Supabase Auth signup is
// email-confirmed (called from /verification-email right after verifyOtp
// succeeds — signUp() itself establishes no session while confirmation is
// pending, so this can't run any earlier). The identity (id, email) and the
// form fields collected at signup are both read server-side off the
// authenticated Supabase user — id/email via getUser() (never trusted from
// the request body), form fields via user_metadata (set at signUp time,
// carried on the auth user itself across the unconfirmed→confirmed gap).
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser || !authUser.email) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: existing, error: existingError } = await db
    .from("User")
    .select("id, email")
    .eq("id", authUser.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return NextResponse.json({ id: existing.id, email: existing.email });
  }

  const metadata = authUser.user_metadata ?? {};
  const name = typeof metadata.name === "string" ? metadata.name.trim() : "";
  const phone = typeof metadata.phone === "string" ? metadata.phone.trim() : undefined;
  const dateOfBirthRaw = typeof metadata.dateOfBirth === "string" ? metadata.dateOfBirth.trim() : "";
  const profileCategoryRaw = typeof metadata.profileCategory === "string" ? metadata.profileCategory : "";

  if (!name) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Supabase's client wants an ISO string for a timestamp column, not a Date object (unlike
  // Prisma) — still parsed as a Date first purely to validate the input.
  let dateOfBirth: string | undefined;
  if (dateOfBirthRaw) {
    const parsed = new Date(dateOfBirthRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "invalid_date_of_birth" }, { status: 400 });
    }
    dateOfBirth = parsed.toISOString();
  }

  const profileCategory = VALID_CATEGORIES.has(profileCategoryRaw)
    ? (profileCategoryRaw as "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER")
    : undefined;

  // A `User` row may already hold this email under a different id — a leftover
  // from a since-deleted Auth account, since removing an `auth.users` row does
  // not cascade to `User`. Supabase Auth guarantees the email now belongs to
  // `authUser`, so re-home that row onto the current id (the FKs are
  // ON UPDATE CASCADE) rather than let the insert hit the `email` UNIQUE
  // constraint — which would 500 and leave the account with no profile row,
  // so `getAppUser()` returns null and the dashboard never renders.
  const { data: staleByEmail, error: staleByEmailError } = await db
    .from("User")
    .select("id")
    .eq("email", authUser.email)
    .maybeSingle();
  if (staleByEmailError) throw staleByEmailError;
  if (staleByEmail && staleByEmail.id !== authUser.id) {
    const { data: reclaimed, error: reclaimError } = await db
      .from("User")
      .update({ id: authUser.id, name, phone, dateOfBirth, profileCategory })
      .eq("email", authUser.email)
      .select("id, email")
      .single();
    if (reclaimError) throw reclaimError;
    return NextResponse.json({ id: reclaimed.id, email: reclaimed.email });
  }

  const { data: user, error: createError } = await db
    .from("User")
    .insert({ id: authUser.id, name, email: authUser.email, phone, dateOfBirth, profileCategory })
    .select("id, email")
    .single();
  if (createError) throw createError;

  return NextResponse.json({ id: user.id, email: user.email });
}
