"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import { getAuthTheme, parseAuthWorkspace, authQueryString } from "@/lib/authTheme";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";

function ConnexionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const workspace = parseAuthWorkspace(params.get("workspace"));
  const theme = getAuthTheme(workspace);
  const { t } = useLocale();

  const subtitle =
    workspace === "ADOLESCENT"
      ? t.auth.loginSubtitleAdos
      : workspace === "PARENT_TEACHER"
        ? t.auth.loginSubtitleParents
        : t.auth.loginSubtitle;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (loginError) {
      // An unverified account can't establish a session at all under
      // Supabase Auth (unlike the old NextAuth flow, which deliberately let
      // it sign in gated) — route straight to OTP entry instead of showing
      // a generic login error.
      if (loginError.code === "email_not_confirmed") {
        router.push(`/verification-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(t.auth.loginError);
      return;
    }

    router.push(next || "/tableau-de-bord");
    router.refresh();
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
      {workspace && (
        <span
          className={`mx-auto mt-4 w-fit rounded-full border bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide ${theme.badgeClass}`}
        >
          {workspace === "ADOLESCENT" ? t.hub.adosCardTitle : t.hub.parentsCardTitle}
        </span>
      )}
      <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.loginTitle}</h1>
      <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-ink">{t.auth.email}</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-medium text-ink">{t.auth.password}</label>
            <Link href="/mot-de-passe-oublie" className={`text-xs font-medium ${theme.linkClass}`}>
              {t.auth.forgotPassword}
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`mt-2 rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-60 ${theme.buttonClass}`}
        >
          {loading ? t.auth.loggingIn : t.auth.login}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t.auth.noAccount}{" "}
        <Link href={`/inscription${authQueryString(workspace)}`} className={`font-medium ${theme.linkClass}`}>
          {t.auth.createAccount}
        </Link>
      </p>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionForm />
    </Suspense>
  );
}
