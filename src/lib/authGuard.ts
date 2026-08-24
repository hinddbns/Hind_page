import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/session";

// Single choke point for "is there a logged-in, verified user" — every Route
// Handler that guards student-only functionality (videos, enrollments,
// messages, progress, receipts, questionnaire, profile) calls this instead of
// re-checking session + verification separately. Return shape is unchanged
// from the NextAuth-era version so none of those call sites needed editing.
export async function requireVerifiedSession() {
  const user = await getAppUser();
  if (!user) {
    return { session: null, response: NextResponse.json({ error: "not_authenticated" }, { status: 401 }) } as const;
  }
  if (!user.verified) {
    return { session: null, response: NextResponse.json({ error: "email_not_verified" }, { status: 403 }) } as const;
  }
  return { session: { user }, response: null } as const;
}
