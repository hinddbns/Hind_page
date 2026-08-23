// Single choke point for outbound email. No provider is configured yet — see
// docs/ROADMAP.md. Until RESEND_API_KEY (or an equivalent) is set, this logs
// the message instead of sending it, so the rest of the app (password reset,
// enrollment notifications) can be built and tested against a stable
// interface now, with only this function needing to change later.
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:unconfigured] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "no-reply@example.com",
      to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    console.error(`[email:send_failed] to=${to} subject="${subject}" status=${res.status}`);
  }
}
