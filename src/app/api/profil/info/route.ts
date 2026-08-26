import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/db";
import { requireVerifiedSession } from "@/lib/authGuard";

const VALID_CATEGORIES = new Set(["MOTHER", "TEACHER", "ADOLESCENT", "OTHER"]);

export async function POST(req: Request) {
  const { session, response } = await requireVerifiedSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const dateOfBirthRaw = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
  const profileCategoryRaw = typeof body.profileCategory === "string" ? body.profileCategory : "";

  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  // Supabase's client wants an ISO string for a timestamp column, not a Date object (unlike
  // Prisma) — still parsed as a Date first purely to validate the input.
  let dateOfBirth: string | null = null;
  if (dateOfBirthRaw) {
    const parsed = new Date(dateOfBirthRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "invalid_date_of_birth" }, { status: 400 });
    }
    dateOfBirth = parsed.toISOString();
  }

  const profileCategory = VALID_CATEGORIES.has(profileCategoryRaw)
    ? (profileCategoryRaw as "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER")
    : null;

  const { error } = await db
    .from("User")
    .update({ name, phone: phone || null, dateOfBirth, profileCategory })
    .eq("id", session.user.id);
  if (error) throw error;

  return NextResponse.json({ ok: true });
}
