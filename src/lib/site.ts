export const site = {
  name: "هند بنياس",
  tagline: "مدربة وعي معتمدة من مؤسسة صناع القرار الدولية",
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
  motherTeenPhoto: "/maman.png",
  motherTeenPhotoWidth: 1365,
  motherTeenPhotoHeight: 768,
  adosPhoto: "/ados.jpeg",
  adosPhotoWidth: 1376,
  adosPhotoHeight: 768,
  bankDetails: {
    bank: "Attijariwafa Bank",
    holder: "Hind Benyas",
    rib: "007 780 0001234567890012 34",
    iban: "MA00 0077 8000 0123 4567 8900 12",
  },
  social: {
    parents: {
      instagram: "https://instagram.com/",
      facebook: "https://facebook.com/",
    },
    ados: {
      instagram: "https://instagram.com/",
      facebook: "https://facebook.com/",
      tiktok: "https://tiktok.com/",
    },
  },
  whatsappNumber: "212600000000",
};

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
