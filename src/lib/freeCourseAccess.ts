// Pure rules for the free course's per-group link (/free-course/{accessCode}) — no database or
// Next.js imports, so the page, admin action and unit tests share one definition. Mirrored by the
// FreeCourse_accessCode_format CHECK in prisma/migrations/20261017120000_free_course_group_link.

export const FREE_COURSE_BASE_PATH = "/free-course";

export const ACCESS_CODE_MIN_LENGTH = 3;
export const ACCESS_CODE_MAX_LENGTH = 40;
const ACCESS_CODE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Expiry dates are whole calendar days in Morocco, where the groups are. */
export const ACCESS_TIME_ZONE = "Africa/Casablanca";

export type AccessLinkStatus = "open" | "noCode" | "wrongCode" | "expired";

/** Trims and lowercases what the admin typed; spaces become hyphens for convenience. */
export function normalizeAccessCode(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function isValidAccessCode(code: string): boolean {
  return (
    code.length >= ACCESS_CODE_MIN_LENGTH &&
    code.length <= ACCESS_CODE_MAX_LENGTH &&
    ACCESS_CODE_PATTERN.test(code)
  );
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30 and the like). */
export function isValidAccessDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Today's date (YYYY-MM-DD) in Morocco. */
export function todayInAccessTimeZone(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Whether `requestedCode` opens the page right now. The expiry day itself is still valid. */
export function getAccessLinkStatus(
  course: { accessCode: string | null; accessExpiresOn: string | null },
  requestedCode: string,
  now: Date
): AccessLinkStatus {
  if (!course.accessCode) return "noCode";
  if (normalizeAccessCode(requestedCode) !== course.accessCode) return "wrongCode";
  if (course.accessExpiresOn && todayInAccessTimeZone(now) > course.accessExpiresOn) return "expired";
  return "open";
}

export function freeCoursePath(code: string): string {
  return `${FREE_COURSE_BASE_PATH}/${encodeURIComponent(code)}`;
}
