"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const { t } = useLocale();
  const params = useSearchParams();

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase's reset-password email link establishes the recovery session
    // via one of a few possible URL shapes depending on project settings —
    // handle each so this page works regardless of exactly which one fires.
    async function establishRecoverySession() {
      const supabase = createClient();
      const tokenHash = params.get("token_hash");
      const code = params.get("code");

      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
        setInvalid(!!verifyError);
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setInvalid(!!exchangeError);
      } else {
        // No query param — either @supabase/ssr already parsed a hash-based
        // token on client init, or the link was invalid/already used.
        const { data } = await supabase.auth.getSession();
        setInvalid(!data.session);
      }
      setReady(true);
    }
    establishRecoverySession();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t.auth.errorPasswordMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.auth.errorPasswordTooShort);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(t.auth.resetInvalidToken);
      return;
    }

    setSuccess(true);
  }

  if (!ready) return null;

  if (invalid) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-danger">{t.auth.resetInvalidToken}</p>
        <Link href="/mot-de-passe-oublie" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {t.auth.resetRequestNew}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mt-8 text-center">
        <h1 className="font-serif text-2xl text-ink">{t.auth.resetSuccessTitle}</h1>
        <p className="mt-3 text-sm text-ink-soft">{t.auth.resetSuccessBody}</p>
        <Link href="/connexion" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          {t.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.resetPasswordTitle}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t.auth.resetPasswordSubtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="reset-new-password" className="mb-1 block text-sm font-medium text-ink">
            {t.auth.newPassword}
          </label>
          <PasswordInput
            id="reset-new-password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
        </div>
        <div>
          <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-ink">
            {t.auth.confirmPassword}
          </label>
          <PasswordInput
            id="reset-confirm-password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>

        {error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
        >
          {loading ? t.auth.resetting : t.auth.resetPassword}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <Image
        src={site.logo}
        alt={site.name}
        width={site.logoWidth}
        height={site.logoHeight}
        className="mx-auto h-24 w-auto rounded-2xl"
      />
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
