import path from "node:path";

export const VIDEOS_DIR = path.join(process.cwd(), "uploads", "videos");
export const DEMO_VIDEOS_DIR = path.join(process.cwd(), "public", "uploads", "demos");
export const DEMO_VIDEOS_PUBLIC_PREFIX = "/uploads/demos";

export const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB

export function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    case "video/mp4":
      return ".mp4";
    case "video/webm":
      return ".webm";
    case "video/ogg":
      return ".ogv";
    case "video/quicktime":
      return ".mov";
    default:
      return "";
  }
}
