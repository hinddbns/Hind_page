"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createSeekGuard, onSeeked, onSeeking, onTimeUpdate, type SeekGuardResult } from "@/lib/seekGuard";

// Bunny's documented Player.js build (https://bunny.net/docs/stream/playback-api). Only loaded on
// pages where skipping is disabled; the normal free-course embed ships no player script at all.
const PLAYERJS_SRC = "https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js";
// If the script can't load, show the video anyway rather than an empty frame (fails open).
const SCRIPT_TIMEOUT_MS = 8000;

type PlayerJsCallback = (data?: { seconds?: number }) => void;
type PlayerJsPlayer = {
  on(event: string, callback: PlayerJsCallback): void;
  off(event: string, callback?: PlayerJsCallback): void;
  getCurrentTime(callback: (seconds: number) => void): void;
  setCurrentTime(seconds: number): void;
};
declare global {
  interface Window {
    playerjs?: { Player: new (iframe: HTMLIFrameElement) => PlayerJsPlayer };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadPlayerJs(): Promise<void> {
  if (window.playerjs) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PLAYERJS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error("Player.js failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * The free course's Bunny iframe with forward seeking restricted to what was genuinely watched.
 * Bunny can't cancel a seek, so jumps ahead are snapped back (see src/lib/seekGuard.ts); replay
 * is free. Browser-side deterrent only — the embed URL itself stays public.
 */
export default function BunnySeekGuardPlayer({
  embedUrl,
  title,
  className,
}: {
  embedUrl: string;
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
    loadPlayerJs().then(
      () => !cancelled && setStatus((s) => (s === "loading" ? "ready" : s)),
      () => !cancelled && setStatus("failed")
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  // Layout effect: Player.js only completes its handshake if the Player exists before the iframe
  // finishes loading, and the iframe only receives its src in the same commit as status "ready".
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (status !== "ready" || !iframe || !window.playerjs) return;

    const player = new window.playerjs.Player(iframe);
    let guard = createSeekGuard();
    let disposed = false;

    const apply = (result: SeekGuardResult) => {
      guard = result.state;
      if (result.correctTo !== null && !disposed) player.setCurrentTime(result.correctTo);
    };
    const handleTimeUpdate: PlayerJsCallback = (data) => {
      if (!disposed && typeof data?.seconds === "number") apply(onTimeUpdate(guard, data.seconds, performance.now()));
    };
    // Bunny emits `seeking` (verified on the live player) though the docs only list `seeked`; it
    // carries no position, so ask for it. Correcting here avoids buffering the far-ahead segment.
    const handleSeeking: PlayerJsCallback = () => {
      if (disposed) return;
      player.getCurrentTime((seconds) => {
        if (!disposed) apply(onSeeking(guard, seconds, performance.now()));
      });
    };
    const handleSeeked: PlayerJsCallback = (data) => {
      if (!disposed && typeof data?.seconds === "number") apply(onSeeked(guard, data.seconds, performance.now()));
    };
    const handleReady: PlayerJsCallback = () => {
      if (disposed) return;
      player.on("timeupdate", handleTimeUpdate);
      player.on("seeking", handleSeeking);
      player.on("seeked", handleSeeked);
    };
    player.on("ready", handleReady);

    return () => {
      disposed = true;
      player.off("ready", handleReady);
      player.off("timeupdate", handleTimeUpdate);
      player.off("seeking", handleSeeking);
      player.off("seeked", handleSeeked);
    };
  }, [status, embedUrl]);

  return (
    <iframe
      ref={iframeRef}
      src={status === "loading" ? undefined : embedUrl}
      title={title}
      allow="accelerometer; gyroscope; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      className={className}
    />
  );
}
