import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getAppUser } from "@/lib/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav user={user} />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <Footer />
    </div>
  );
}
