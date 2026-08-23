import { site } from "@/lib/site";

// Single choke point for outbound email, via Resend. The sender is entirely
// environment-driven — EMAIL_FROM is meant to hold the real "Name <address@domain>"
// once a production domain is chosen (see docs/ROADMAP.md). Until it's set, this falls
// back to Resend's own test sender (onboarding@resend.dev), which sends real mail
// without requiring a verified domain — a deliberate stand-in for development, not a
// hardcoded business domain.
//
// Until RESEND_API_KEY is set, this logs the message instead of sending it, so the
// rest of the app (password reset, enrollment notifications) can be built and tested
// against a stable interface now, with only this function needing to change later.
const TEST_SENDER = `${site.name} <onboarding@resend.dev>`;

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || TEST_SENDER;

  if (!apiKey) {
    console.log(`[email:unconfigured] to=${to} from=${from} subject="${subject}"\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    console.error(`[email:send_failed] to=${to} subject="${subject}" status=${res.status}`);
  }
}
