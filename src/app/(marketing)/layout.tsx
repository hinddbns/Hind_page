import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getAppUser } from "@/lib/session";
import { getSocialLinksByVariant } from "@/lib/socialLinks";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();
  const socialLinksByVariant = await getSocialLinksByVariant();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav user={user} />
      <main className="flex-1 animate-shell-arrive">{children}</main>
      <Footer socialLinksByVariant={socialLinksByVariant} />
    </div>
  );
}
