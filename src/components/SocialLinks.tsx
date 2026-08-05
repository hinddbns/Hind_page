import { Music2 } from "lucide-react";
import { site } from "@/lib/site";

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function SocialLinks({
  className = "",
  variant = "parents",
}: {
  className?: string;
  variant?: "parents" | "ados";
}) {
  const socials = site.social[variant];
  const links = [
    { href: socials.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: socials.facebook, label: "Facebook", Icon: FacebookIcon },
    ...("tiktok" in socials ? [{ href: socials.tiktok, label: "TikTok", Icon: Music2 }] : []),
  ];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-light/60 text-ink-soft transition hover:border-primary hover:text-primary"
        >
          <Icon className="h-[18px] w-[18px]" size={18} />
        </a>
      ))}
    </div>
  );
}
