"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";
import { site } from "@/lib/site";
import { getAuthTheme, parseAuthWorkspace, authQueryString } from "@/lib/authTheme";
import PasswordInput from "@/components/PasswordInput";

type ProfileCategory = "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER" | "";

function InscriptionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const workspace = parseAuthWorkspace(params.get("workspace"));
  const theme = getAuthTheme(workspace);
  const { t } = useLocale();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    profileCategory: (workspace === "ADOLESCENT" ? "ADOLESCENT" : "") as ProfileCategory,
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== confirmPassword) {
      setError(t.auth.errorPasswordMismatch);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          missing_fields: t.auth.errorMissingFields,
          invalid_email: t.auth.errorInvalidEmail,
          password_too_short: t.auth.errorPasswordTooShort,
          invalid_date_of_birth: t.auth.errorInvalidDateOfBirth,
          email_taken: t.auth.errorEmailTaken,
        };
        setError(errorMessages[data.error] || t.auth.genericError);
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      setLoading(false);

      if (signInRes?.error) {
        router.push("/connexion");
        return;
      }

      router.push("/tableau-de-bord");
      router.refresh();
    } catch {
      setError(t.auth.networkError);
      setLoading(false);
    }
  }

  const categories: { value: ProfileCategory; label: string }[] = [
    { value: "MOTHER", label: t.auth.profileCategoryMother },
    { value: "TEACHER", label: t.auth.profileCategoryTeacher },
    { value: "ADOLESCENT", label: t.auth.profileCategoryAdolescent },
    { value: "OTHER", label: t.auth.profileCategoryOther },
  ];

  const subtitle =
    workspace === "ADOLESCENT"
      ? t.auth.signupSubtitleAdos
      : workspace === "PARENT_TEACHER"
        ? t.auth.signupSubtitleParents
        : t.auth.signupSubtitle;

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
      <h1 className="mt-6 font-serif text-3xl text-ink">{t.auth.signupTitle}</h1>
      <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-ink">{t.auth.fullName}</label>
          <input
            id="signup-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-ink">{t.auth.email}</label>
          <input
            id="signup-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="signup-phone" className="mb-1 block text-sm font-medium text-ink">{t.auth.phone}</label>
          <input
            id="signup-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="signup-dob" className="mb-1 block text-sm font-medium text-ink">{t.auth.dateOfBirth}</label>
          <input
            id="signup-dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <span id="signup-category-label" className="mb-1 block text-sm font-medium text-ink">{t.auth.profileCategory}</span>
          <div role="group" aria-labelledby="signup-category-label" className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => update("profileCategory", form.profileCategory === c.value ? "" : c.value)}
                className={`min-w-[45%] flex-1 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  form.profileCategory === c.value ? theme.toggleActiveClass : theme.toggleInactiveClass
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-ink">{t.auth.password}</label>
          <PasswordInput
            id="signup-password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(value) => update("password", value)}
          />
          <p className="mt-1 text-xs text-ink-soft">{t.auth.passwordHint}</p>
        </div>
        <div>
          <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-medium text-ink">{t.auth.confirmPassword}</label>
          <PasswordInput
            id="signup-confirm-password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
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
          {loading ? t.auth.creating : t.auth.createMyAccount}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t.auth.alreadyRegistered}{" "}
        <Link href={`/connexion${authQueryString(workspace)}`} className={`font-medium ${theme.linkClass}`}>
          {t.auth.signIn}
        </Link>
      </p>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={null}>
      <InscriptionForm />
    </Suspense>
  );
}
