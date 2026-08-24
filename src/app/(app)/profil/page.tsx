import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import PersonalInfoForm from "@/components/PersonalInfoForm";

export default async function ProfilPage() {
  const appUser = await getAppUser();
  if (!appUser) redirect("/connexion?next=/profil");

  const { t } = await getT();

  const user = await prisma.user.findUnique({ where: { id: appUser.id } });
  if (!user) redirect("/connexion");

  const dateOfBirthValue = user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">{t.profil.title}</h1>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.profil.accountInfo}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-ink-soft">
          <dt className="font-medium text-ink">{t.profil.email}</dt>
          <dd>{user.email}</dd>
          <dt className="font-medium text-ink">{t.profil.role}</dt>
          <dd>{user.role === "ADMIN" ? t.profil.roleAdmin : t.profil.roleUser}</dd>
        </dl>
      </div>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.profil.personalInfo}</h2>
        <PersonalInfoForm
          initialName={user.name}
          initialPhone={user.phone ?? ""}
          initialDateOfBirth={dateOfBirthValue}
          initialProfileCategory={user.profileCategory ?? ""}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-primary-light/50 bg-white p-6">
        <h2 className="font-serif text-lg text-ink">{t.profil.changePassword}</h2>
        <PasswordChangeForm email={user.email} />
      </div>
    </div>
  );
}
