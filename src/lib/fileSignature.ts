function matchesBytes(buffer: Buffer, offset: number, bytes: number[]) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

function isWebpImage(buffer: Buffer) {
  return (
    matchesBytes(buffer, 0, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    matchesBytes(buffer, 8, [0x57, 0x45, 0x42, 0x50]) // "WEBP"
  );
}

const ISO_BASE_MEDIA_BRANDS = ["ftyp", "moov", "free", "mdat", "wide", "pnot", "skip"];

function isIsoBaseMediaVideo(buffer: Buffer) {
  if (buffer.length < 12) return false;
  const brand = buffer.subarray(4, 8).toString("ascii");
  return ISO_BASE_MEDIA_BRANDS.includes(brand);
}

/** Verifies a file's actual magic-byte signature matches the claimed MIME type,
 * since the client-supplied File.type is trivially spoofable. */
export function matchesFileSignature(mime: string, buffer: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return matchesBytes(buffer, 0, [0xff, 0xd8, 0xff]);
    case "image/png":
      return matchesBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return isWebpImage(buffer);
    case "application/pdf":
      return matchesBytes(buffer, 0, [0x25, 0x50, 0x44, 0x46]); // "%PDF"
    case "video/mp4":
    case "video/quicktime":
      return isIsoBaseMediaVideo(buffer);
    case "video/webm":
      return matchesBytes(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3]); // EBML/Matroska header
    case "video/ogg":
      return matchesBytes(buffer, 0, [0x4f, 0x67, 0x67, 0x53]); // "OggS"
    default:
      return false;
  }
}
