"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

type ProfileCategory = "MOTHER" | "TEACHER" | "ADOLESCENT" | "OTHER" | "";

export default function PersonalInfoForm({
  initialName,
  initialPhone,
  initialDateOfBirth,
  initialProfileCategory,
}: {
  initialName: string;
  initialPhone: string;
  initialDateOfBirth: string;
  initialProfileCategory: ProfileCategory;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
  const [profileCategory, setProfileCategory] = useState<ProfileCategory>(initialProfileCategory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categories: { value: ProfileCategory; label: string }[] = [
    { value: "MOTHER", label: t.auth.profileCategoryMother },
    { value: "TEACHER", label: t.auth.profileCategoryTeacher },
    { value: "ADOLESCENT", label: t.auth.profileCategoryAdolescent },
    { value: "OTHER", label: t.auth.profileCategoryOther },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/profil/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, dateOfBirth, profileCategory }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const errorMessages: Record<string, string> = {
        name_required: t.profil.errorNameRequired,
        invalid_date_of_birth: t.auth.errorInvalidDateOfBirth,
      };
      setError(errorMessages[data.error] || t.profil.errorGeneric);
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-ink">{t.auth.fullName}</label>
        <input
          id="profile-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-sm font-medium text-ink">{t.auth.phone}</label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="profile-dob" className="mb-1 block text-sm font-medium text-ink">{t.auth.dateOfBirth}</label>
        <input
          id="profile-dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="w-full rounded-lg border border-primary-light bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
        />
      </div>
      <div>
        <span id="profile-category-label" className="mb-1 block text-sm font-medium text-ink">{t.auth.profileCategory}</span>
        <div role="group" aria-labelledby="profile-category-label" className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setProfileCategory((cur) => (cur === c.value ? "" : c.value))}
              className={`min-w-[45%] flex-1 rounded-full border px-3 py-2 text-sm font-medium transition ${
                profileCategory === c.value
                  ? "border-primary bg-primary text-cream"
                  : "border-primary-light text-ink-soft hover:border-primary hover:text-primary"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{t.profil.infoUpdated}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 self-start rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? t.profil.savingInfo : t.profil.editInfoBtn}
      </button>
    </form>
  );
}
