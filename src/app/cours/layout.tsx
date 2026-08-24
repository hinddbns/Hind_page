import { getAppUser } from "@/lib/session";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AppNav from "@/components/AppNav";
import AppFooter from "@/components/AppFooter";

export default async function CoursLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();

  if (user) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-app-tint">
        <AppNav user={user} />
        <main className="flex-1 animate-shell-arrive">{children}</main>
        <AppFooter user={user} />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav user={null} />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <Footer />
    </div>
  );
}
