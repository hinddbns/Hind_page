"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordForm() {
  const { t } = useLocale();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "too_short" ? t.auth.errorPasswordTooShort : t.auth.resetInvalidToken);
      return;
    }

    setSuccess(true);
  }

  if (!token) {
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
