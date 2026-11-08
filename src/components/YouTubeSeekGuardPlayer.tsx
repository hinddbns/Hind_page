"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSeekGuard, onTimeUpdate } from "@/lib/seekGuard";
import { YOUTUBE_EMBED_ORIGIN, buildYouTubeEmbedUrl } from "@/lib/youtube";

// YouTube's documented IFrame Player API loader (https://developers.google.com/youtube/iframe_api_reference).
// Only loaded on pages where skipping is disabled; the normal YouTube embed ships no player script.
const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
// If the script can't load, show the video anyway rather than an empty frame (fails open).
const SCRIPT_TIMEOUT_MS = 8000;
// The API has no seek events, so the position is sampled; 4×/s keeps a jump visible for <0.25s.
const POLL_INTERVAL_MS = 250;

type YouTubePlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};
declare global {
  interface Window {
    YT?: {
      loaded?: number;
      Player: new (
        iframe: HTMLIFrameElement,
        options: { host?: string; events?: { onReady?: () => void } }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadIframeApi(): Promise<void> {
  if (window.YT?.loaded === 1) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise<void>((resolve, reject) => {
      // The API announces itself through this one global; chain any callback already there.
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement("script");
      script.src = IFRAME_API_SRC;
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        script.remove();
        reject(new Error("YouTube IFrame API failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

/**
 * The free course's YouTube embed with forward seeking restricted to what was genuinely watched —
 * the same rule as BunnySeekGuardPlayer (src/lib/seekGuard.ts), fed by sampling the position since
 * YouTube emits no seek events. Jumps ahead are snapped back; replay is free. Browser-side
 * deterrent only — the video itself stays public on YouTube.
 */
export default function YouTubeSeekGuardPlayer({
  videoId,
  title,
  className,
}: {
  videoId: string;
  title: string;
  className: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === "loading" ? "failed" : s));
    }, SCRIPT_TIMEOUT_MS);
    loadIframeApi().then(
      () => !cancelled && setStatus((s) => (s === "loading" ? "ready" : s)),
      () => !cancelled && setStatus("failed")
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  // Layout effect so the Player attaches in the same commit the iframe receives its src.
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (status !== "ready" || !iframe || !window.YT) return;

    let guard = createSeekGuard();
    let interval: number | undefined;
    let disposed = false;

    const player = new window.YT.Player(iframe, {
      host: YOUTUBE_EMBED_ORIGIN,
      events: {
        onReady: () => {
          if (disposed) return;
          interval = window.setInterval(() => {
            const result = onTimeUpdate(guard, player.getCurrentTime(), performance.now());
            guard = result.state;
            if (result.correctTo !== null) player.seekTo(result.correctTo, true);
          }, POLL_INTERVAL_MS);
        },
      },
    });

    // No player.destroy(): on an existing iframe it removes the element React still owns.
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [status, videoId]);

  const src =
    status === "loading"
      ? undefined
      : status === "ready"
        ? buildYouTubeEmbedUrl(videoId, { jsApiOrigin: window.location.origin })
        : buildYouTubeEmbedUrl(videoId);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowFullScreen
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      className={className}
    />
  );
}
