import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { db } from "@/lib/supabase/db";
import WhatsAppButton from "@/components/WhatsAppButton";
import ToastViewport from "@/components/ToastViewport";
import ar from "@/i18n/dictionaries/ar";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description:
    "مرافقة معتمدة عبر الإنترنت — مساحة خاصة بالمراهقين، ومساحة أخرى للأمهات والأستاذات اللواتي يواكبنهم. دورات مصورة ومتابعة شخصية.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // A plain read, not upsert() — this runs on every page load site-wide, and
  // the "main" row already exists from the first admin/parametres visit, so
  // there's no need to issue a write on every request just to guarantee it.
  const { data: settings, error } = await db.from("Settings").select("whatsappNumber").eq("id", "main").maybeSingle();
  if (error) throw error;

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {children}
        <WhatsAppButton label={ar.common.whatsappContact} whatsappNumber={settings?.whatsappNumber ?? "212600000000"} />
        <ToastViewport />
      </body>
    </html>
  );
}
