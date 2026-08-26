"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VerificationForm() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (code.length !== 6) return;

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    if (verifyError) {
      setLoading(false);
      setError(t.auth.verifyEmailErrorInvalidOrExpired);
      setCode("");
      return;
    }

    // Only reachable once verifyOtp has established a confirmed session —
    // signUp() itself grants none while confirmation is pending, so the
    // profile row can't be created any earlier than this.
    await fetch("/api/auth/create-profile", { method: "POST" });

    setLoading(false);
    setSuccess(true);
    router.push("/tableau-de-bord");
    router.refresh();
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    setResendMessage(t.auth.verifyEmailResendSuccess);
    setSecondsLeft(OTP_TTL_SECONDS);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setCode("");
    inputRef.current?.focus();
  }

  if (!email) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-danger">{t.auth.verifyEmailNoAccount}</p>
        <Link href="/connexion" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          {t.auth.verifyEmailBackToLogin}
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mt-6 text-center font-serif text-3xl text-ink">{t.auth.verifyEmailTitle}</h1>
      <p className="mt-2 text-center text-sm text-ink-soft">
        {t.auth.verifyEmailSubtitle.replace("{email}", email)}
      </p>

      {success ? (
        <p role="status" className="mt-8 text-center text-sm text-success">{t.auth.verifyEmailSuccess}</p>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-ink">
                {t.auth.verifyEmailCodeLabel}
              </label>
              <input
                ref={inputRef}
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  handleCodeChange(e.clipboardData.getData("text"));
                }}
                className="w-full rounded-lg border border-primary-light bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-ink outline-none focus:border-primary"
              />
              {secondsLeft > 0 && (
                <p className="mt-1 text-xs text-ink-soft">
                  {t.auth.verifyEmailExpiresIn.replace("{time}", formatTime(secondsLeft))}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
            )}
            {resendMessage && !error && (
              <p role="status" className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{resendMessage}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
            >
              {loading ? t.auth.verifyEmailVerifying : t.auth.verifyEmailVerify}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || cooldown > 0}
            className="mx-auto mt-6 block text-center text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
          >
            {resendLoading
              ? t.auth.verifyEmailResending
              : cooldown > 0
                ? t.auth.verifyEmailResendCooldown.replace("{seconds}", String(cooldown))
                : t.auth.verifyEmailResend}
          </button>
        </>
      )}
    </>
  );
}

export default function VerificationEmailPage() {
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
        <VerificationForm />
      </Suspense>
    </div>
  );
}
