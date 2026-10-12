// Pure progress tracker for the free course's "no skipping" mode — no DOM, no player, so every
// rule here is unit-tested (seekGuard.test.ts). BunnySeekGuardPlayer feeds it Bunny Player.js
// events and applies any `correctTo` with `player.setCurrentTime()`.
//
// Bunny's API can't cancel a seek, so this corrects after the fact: a forward jump past the
// furthest genuinely watched point is snapped back to it. Backward seeks/replay are always free.
// It's a deterrent only — the public embed URL can be opened directly without this guard.

/** How far past the furthest watched point a position may be before it's corrected (jitter room). */
export const SEEK_TOLERANCE_SECONDS = 2;
/** The previous tick must be this close to the furthest point for playback to extend it. */
const CONTINUITY_EPSILON_SECONDS = 0.5;
/** Fastest playback a tick may represent (Bunny's speed menu tops out at 2x) plus fixed slack. */
const MAX_PLAYBACK_RATE = 2.5;
const STEP_SLACK_SECONDS = 1;
/** timeupdate and seeking can both report the same jump; don't seek twice to the same point. */
const CORRECTION_DEDUPE_MS = 1000;
/** If a `seeked` never arrives (observed for far-ahead seeks), stop treating the seek as active. */
const STALE_SEEK_MS = 5000;

export type SeekGuardState = {
  furthest: number;
  /** Last position seen, or null right after load/correction (the next tick only re-anchors). */
  last: number | null;
  lastWallMs: number;
  seekingSinceMs: number | null;
  lastCorrection: { to: number; atMs: number } | null;
};

export type SeekGuardResult = { state: SeekGuardState; correctTo: number | null };

export function createSeekGuard(): SeekGuardState {
  return { furthest: 0, last: null, lastWallMs: 0, seekingSinceMs: null, lastCorrection: null };
}

function isAhead(state: SeekGuardState, seconds: number) {
  return seconds > state.furthest + SEEK_TOLERANCE_SECONDS;
}

/** Snap back to the furthest watched point (at most once per dedupe window for the same target). */
function correct(state: SeekGuardState, nowMs: number): SeekGuardResult {
  const target = state.furthest;
  const recent = state.lastCorrection;
  const duplicate = recent !== null && recent.to === target && nowMs - recent.atMs < CORRECTION_DEDUPE_MS;
  // `last` resets so the tick that lands on the target only re-anchors, never counts as watched.
  return {
    state: { ...state, last: null, lastCorrection: duplicate ? recent : { to: target, atMs: nowMs } },
    correctTo: duplicate ? null : target,
  };
}

function anchor(state: SeekGuardState, seconds: number, nowMs: number): SeekGuardResult {
  return { state: { ...state, last: seconds, lastWallMs: nowMs }, correctTo: null };
}

/** A tick during playback. Only small, wall-clock-plausible steps from the watched frontier count. */
export function onTimeUpdate(state: SeekGuardState, seconds: number, nowMs: number): SeekGuardResult {
  if (!Number.isFinite(seconds)) return { state, correctTo: null };
  if (isAhead(state, seconds)) return correct(state, nowMs);

  const { last, lastWallMs, furthest, seekingSinceMs } = state;
  const seeking = seekingSinceMs !== null && nowMs - seekingSinceMs < STALE_SEEK_MS;
  const maxStep = Math.max(0, (nowMs - lastWallMs) / 1000) * MAX_PLAYBACK_RATE + STEP_SLACK_SECONDS;
  const continuous = last !== null && seconds >= last && seconds - last <= maxStep;

  if (!seeking && continuous && last <= furthest + CONTINUITY_EPSILON_SECONDS) {
    const next = { ...state, furthest: Math.max(furthest, seconds), seekingSinceMs: null };
    return anchor(next, seconds, nowMs);
  }
  return anchor(state, seconds, nowMs);
}

/** A seek has started; `seconds` is the target (Player.js getCurrentTime while seeking). */
export function onSeeking(state: SeekGuardState, seconds: number, nowMs: number): SeekGuardResult {
  const seekingState = { ...state, seekingSinceMs: nowMs };
  if (Number.isFinite(seconds) && isAhead(seekingState, seconds)) return correct(seekingState, nowMs);
  return { state: seekingState, correctTo: null };
}

/** A seek finished at `seconds`. Allowed positions become the new anchor (replay is free). */
export function onSeeked(state: SeekGuardState, seconds: number, nowMs: number): SeekGuardResult {
  const settled = { ...state, seekingSinceMs: null };
  if (!Number.isFinite(seconds)) return { state: settled, correctTo: null };
  if (isAhead(settled, seconds)) return correct(settled, nowMs);
  return anchor(settled, seconds, nowMs);
}
