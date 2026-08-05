import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppNav from "@/components/AppNav";
import AppFooter from "@/components/AppFooter";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-app-tint">
      <AppNav />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <AppFooter />
    </div>
  );
}
