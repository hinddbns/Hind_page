import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/session";
import AppNav from "@/components/AppNav";
import AppFooter from "@/components/AppFooter";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();
  if (!user) redirect("/connexion");
  if (!user.verified) redirect("/verification-email");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-app-tint">
      <AppNav user={user} />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <AppFooter user={user} />
    </div>
  );
}
