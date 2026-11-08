export const site = {
  name: "هند بنياس",
  tagline: "مدربة وعي معتمدة واستشارية الصحة النفسية للمراهقين والراشدين",
  logo: "/logo.jpg",
  logoWidth: 922,
  logoHeight: 1152,
  coachPhoto: "/personal.webp",
  coachPhotoWidth: 1589,
  coachPhotoHeight: 2200,
  heroPhoto: "/me.png",
  heroPhotoWidth: 941,
  heroPhotoHeight: 1672,
  coachWorkPhoto: "/coach-work.jpg",
  coachWorkPhotoWidth: 1600,
  coachWorkPhotoHeight: 2400,
  motherTeenPhoto: "/parents-mothers-hero.jpg",
  motherTeenPhotoWidth: 1365,
  motherTeenPhotoHeight: 768,
  adosPhoto: "/ados-hero.jpg",
  adosPhotoWidth: 1376,
  adosPhotoHeight: 768,
  bankDetails: {
    bank: "Attijariwafa Bank",
    holder: "Hind Benyas",
    rib: "007 780 0001234567890012 34",
    iban: "MA00 0077 8000 0123 4567 8900 12",
  },
};

// The one image every shared link previews (owner decision 2026-11-08): the logo, never a portrait.
// Pages that set their own openGraph/twitter must repeat it — Next.js merges metadata shallowly,
// so a page-level openGraph would otherwise drop the root layout's image.
export const shareImage = { url: site.logo, width: site.logoWidth, height: site.logoHeight, alt: site.name };
