"use client";

export default function SecureVideoPlayer({ src, className }: { src: string; className?: string }) {
  return (
    <video
      controls
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      className={className}
      src={src}
    />
  );
}
