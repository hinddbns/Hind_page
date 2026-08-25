import { Music2 } from "lucide-react";
import type { SocialLinksMap, SocialPlatformKey } from "@/lib/socialLinks";

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

function YoutubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.5v5l4.5-2.5-4.5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1.3-4.1A8 8 0 1 1 8.6 19L4 20z" />
      <path d="M9 9.8c0 3 2.5 5.4 5.4 5.4.5 0 1-.4 1-.9v-.9l-2.1-.7-.6.9a4.6 4.6 0 0 1-2.6-2.6l.9-.6-.7-2.1h-.9c-.5 0-.9.4-.9 1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const PLATFORM_META: { key: SocialPlatformKey; label: string; Icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { key: "tiktok", label: "TikTok", Icon: Music2 },
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsappIcon },
];

export default function SocialLinks({
  className = "",
  links,
}: {
  className?: string;
  links: SocialLinksMap;
}) {
  const active = PLATFORM_META.filter(({ key }) => links[key]);
  if (active.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {active.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]}
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
