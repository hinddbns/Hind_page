"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SecureVideoPlayer from "@/components/SecureVideoPlayer";

const HEARTBEAT_MS = 5000;
// How far past the furthest legitimately-reached point a scrub is allowed to
// land before we snap it back — small slack for player/precision jitter, not
// a meaningful skip allowance.
const SEEK_GRACE_SECONDS = 3;
const MIN_PLAYBACK_RATE = 0.75;
const MAX_PLAYBACK_RATE = 1.5;

type ProgressEvent = "heartbeat" | "pause" | "ended";

export default function LessonVideoPlayer({
  lessonId,
  src,
  className,
  initialPositionSeconds,
  initialFurthestSeconds,
  initialCompleted,
}: {
  lessonId: string;
  src: string;
  className?: string;
  initialPositionSeconds: number;
  initialFurthestSeconds: number;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const furthestRef = useRef(initialFurthestSeconds);
  const completedRef = useRef(initialCompleted);
  const resumedRef = useRef(false);
  const pendingRef = useRef(false);
  const queuedEventRef = useRef<ProgressEvent | null>(null);

  const send = useCallback(
    async (event: ProgressEvent) => {
      if (pendingRef.current) {
        // Ended/pause matter more than a routine heartbeat — don't let a
        // heartbeat in flight swallow the final position.
        if (event !== "heartbeat" || queuedEventRef.current === null) {
          queuedEventRef.current = event;
        }
        return;
      }

      pendingRef.current = true;
      // A loop (not recursion) so a request queued while this one was in
      // flight still gets sent, without the function calling itself.
      let nextEvent: ProgressEvent | null = event;
      while (nextEvent) {
        const currentEvent = nextEvent;
        nextEvent = null;

        const video = videoRef.current;
        if (!video) break;

        try {
          const res = await fetch(`/api/lessons/${lessonId}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              positionSeconds: Math.floor(video.currentTime),
              durationSeconds: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
              event: currentEvent,
            }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (typeof data?.furthestSeconds === "number") {
              furthestRef.current = Math.max(furthestRef.current, data.furthestSeconds);
            }
            if (data?.completed && !completedRef.current) {
              completedRef.current = true;
              router.refresh();
            }
          }
        } catch {
          // Best-effort — the next heartbeat retries.
        }

        if (queuedEventRef.current) {
          nextEvent = queuedEventRef.current;
          queuedEventRef.current = null;
        }
      }
      pendingRef.current = false;
    },
    [lessonId, router]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      if (resumedRef.current) return;
      resumedRef.current = true;
      if (
        initialPositionSeconds > 0 &&
        Number.isFinite(video.duration) &&
        initialPositionSeconds < video.duration - 1
      ) {
        video.currentTime = initialPositionSeconds;
      }
    };
    const onSeeking = () => {
      if (video.currentTime > furthestRef.current + SEEK_GRACE_SECONDS) {
        video.currentTime = furthestRef.current;
      }
    };
    const onTimeUpdate = () => {
      furthestRef.current = Math.max(furthestRef.current, video.currentTime);
    };
    const onRateChange = () => {
      if (video.playbackRate > MAX_PLAYBACK_RATE || video.playbackRate < MIN_PLAYBACK_RATE) {
        video.playbackRate = 1;
      }
    };
    const onPause = () => {
      if (!video.ended) send("pause");
    };
    const onEnded = () => send("ended");

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ratechange", onRateChange);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    const interval = setInterval(() => {
      if (!video.paused && !video.ended) send("heartbeat");
    }, HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !video.paused && !video.ended) {
        navigator.sendBeacon?.(
          `/api/lessons/${lessonId}/progress`,
          new Blob(
            [
              JSON.stringify({
                positionSeconds: Math.floor(video.currentTime),
                durationSeconds: Number.isFinite(video.duration) ? Math.floor(video.duration) : null,
                event: "heartbeat",
              }),
            ],
            { type: "application/json" }
          )
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ratechange", onRateChange);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [lessonId, initialPositionSeconds, send]);

  return <SecureVideoPlayer ref={videoRef} src={src} className={className} />;
}
