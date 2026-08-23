"use client";

import { forwardRef } from "react";

const SecureVideoPlayer = forwardRef<
  HTMLVideoElement,
  React.VideoHTMLAttributes<HTMLVideoElement> & { src: string; className?: string }
>(function SecureVideoPlayer({ src, className, ...rest }, ref) {
  return (
    <video
      ref={ref}
      controls
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      className={className}
      src={src}
      {...rest}
    />
  );
});

export default SecureVideoPlayer;
