"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import PasswordInput from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ResetPasswordForm() {
  const { t } = useLocale();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [step, setStep] = useState<"otp" | "password" | "done">("otp");

  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    if (code.length !== 6) return;

    setVerifying(true);
    const supabase = createClient();
    // The recovery OTP establishes a short-lived recovery session; only then
    // does updateUser({ password }) below have the rights to change it.
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    setVerifying(false);

    if (error) {
      setOtpError(t.auth.resetCodeInvalidOrExpired);
      setCode("");
      inputRef.current?.focus();
      return;
    }

    setStep("password");
  }

  async function handleResend() {
    setResendMessage(null);
    setOtpError(null);
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email);
    setResendLoading(false);
    setResendMessage(t.auth.verifyEmailResendSuccess);
    setSecondsLeft(OTP_TTL_SECONDS);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setCode("");
    inputRef.current?.focus();
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError(t.auth.errorPasswordMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setPwdError(t.auth.errorPasswordTooShort);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setPwdError(t.auth.resetInvalidToken);
      return;
    }

    setStep("done");
  }

  if (!email) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-danger">{t.auth.resetSessionExpired}</p>
        <Link
          href="/mot-de-passe-oublie"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          {t.auth.resetRequestNew}
        </Link>
      </div>
    );
  }

  if (step === "done") {
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

  if (step === "password") {
    return (
      <>
        <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.resetPasswordTitle}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t.auth.resetPasswordSubtitle}</p>

        <form onSubmit={handleSetPassword} className="mt-8 flex flex-col gap-4">
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

          {pwdError && (
            <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{pwdError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? t.auth.resetting : t.auth.resetPassword}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.resetCodeTitle}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t.auth.resetCodeSubtitle.replace("{email}", email)}</p>

      <form onSubmit={handleVerify} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="reset-otp-code" className="mb-1 block text-sm font-medium text-ink">
            {t.auth.resetCodeLabel}
          </label>
          <input
            ref={inputRef}
            id="reset-otp-code"
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

        {otpError && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{otpError}</p>
        )}
        {resendMessage && !otpError && (
          <p role="status" className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{resendMessage}</p>
        )}

        <button
          type="submit"
          disabled={verifying || code.length !== 6}
          className="mt-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
        >
          {verifying ? t.auth.verifyEmailVerifying : t.auth.verifyEmailVerify}
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

      <Link href="/connexion" className="mt-4 text-center text-sm font-medium text-primary hover:underline">
        {t.auth.backToLogin}
      </Link>
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
