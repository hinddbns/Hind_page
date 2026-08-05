import { auth } from "@/auth";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AppNav from "@/components/AppNav";
import AppFooter from "@/components/AppFooter";

export default async function CoursLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (session?.user) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-app-tint">
        <AppNav />
        <main className="flex-1 animate-shell-arrive">{children}</main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <Footer />
    </div>
  );
}
