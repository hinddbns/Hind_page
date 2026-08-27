"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // Sends the recovery email, whose template renders a 6-digit code
    // ({{ .Token }}) that the user enters on /reinitialiser-mot-de-passe.
    // Any error (including "no account for this address") is intentionally
    // swallowed so the next screen never reveals whether the address exists.
    await supabase.auth.resetPasswordForEmail(email);
    router.push(`/reinitialiser-mot-de-passe?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <Image
        src={site.logo}
        alt={site.name}
        width={site.logoWidth}
        height={site.logoHeight}
        className="mx-auto h-24 w-auto rounded-2xl"
      />

      <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.forgotPasswordTitle}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t.auth.forgotPasswordSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-ink">
            {t.auth.email}
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? t.auth.sending : t.auth.sendResetCode}
        </button>
      </form>

      <Link href="/connexion" className="mt-6 text-center text-sm font-medium text-primary hover:underline">
        {t.auth.backToLogin}
      </Link>
    </div>
  );
}
