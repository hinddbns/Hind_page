import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {children}
        <WhatsAppButton label={ar.common.whatsappContact} />
        <ToastViewport />
      </body>
    </html>
  );
}
