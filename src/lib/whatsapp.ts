// Pure helpers for the shared WhatsApp contact number (Settings.whatsappNumber, edited at
// /admin/parametres). No database import, so tests can run without credentials.

/** The column default from 20260825220000_add_whatsapp_number_to_settings — not a real contact. */
export const PLACEHOLDER_WHATSAPP_NUMBER = "212600000000";

/** Same normalization and format check as the updateWhatsAppNumber admin action. */
export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/[\s+()-]/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

/**
 * A `https://wa.me/` link for a *usable* number, or `null` when the setting is missing, malformed,
 * or still the placeholder — callers should then hide contextual CTAs rather than link nowhere.
 */
export function buildWhatsAppUrl(value: string | null | undefined): string | null {
  const number = normalizeWhatsAppNumber(value);
  if (!number || number === PLACEHOLDER_WHATSAPP_NUMBER) return null;
  return `https://wa.me/${number}`;
}
