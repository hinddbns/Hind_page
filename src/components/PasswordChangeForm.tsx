"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import PasswordInput from "@/components/PasswordInput";

export default function PasswordChangeForm() {
  const { t } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t.profil.errorMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.profil.errorTooShort);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/profil/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      if (data.error === "wrong_current") setError(t.profil.errorWrongCurrent);
      else if (data.error === "too_short") setError(t.profil.errorTooShort);
      else setError(t.profil.errorGeneric);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="change-pwd-current" className="mb-1 block text-sm font-medium text-ink">{t.profil.currentPassword}</label>
        <PasswordInput
          id="change-pwd-current"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
      </div>
      <div>
        <label htmlFor="change-pwd-new" className="mb-1 block text-sm font-medium text-ink">{t.profil.newPassword}</label>
        <PasswordInput
          id="change-pwd-new"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
      </div>
      <div>
        <label htmlFor="change-pwd-confirm" className="mb-1 block text-sm font-medium text-ink">{t.profil.confirmPassword}</label>
        <PasswordInput
          id="change-pwd-confirm"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{t.profil.success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? t.profil.saving : t.profil.save}
      </button>
    </form>
  );
}
