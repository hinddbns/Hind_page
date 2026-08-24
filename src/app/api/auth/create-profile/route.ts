import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set(["MOTHER", "TEACHER", "ADOLESCENT", "OTHER"]);

// Creates the Prisma application-profile row once a Supabase Auth signup is
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

  const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
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

  let dateOfBirth: Date | undefined;
  if (dateOfBirthRaw) {
    const parsed = new Date(dateOfBirthRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "invalid_date_of_birth" }, { status: 400 });
    }
    dateOfBirth = parsed;
  }

  const profileCategory = VALID_CATEGORIES.has(profileCategoryRaw)
    ? (profileCategoryRaw as "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER")
    : undefined;

  const user = await prisma.user.create({
    data: { id: authUser.id, name, email: authUser.email, phone, dateOfBirth, profileCategory },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
