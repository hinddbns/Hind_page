import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set(["MOTHER", "TEACHER", "ADOLESCENT", "OTHER"]);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : "";
  const dateOfBirthRaw = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
  const profileCategoryRaw = typeof body.profileCategory === "string" ? body.profileCategory : "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, dateOfBirth, profileCategory },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
