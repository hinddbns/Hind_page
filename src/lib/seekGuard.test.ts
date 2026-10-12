import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEEK_TOLERANCE_SECONDS,
  createSeekGuard,
  onSeeked,
  onSeeking,
  onTimeUpdate,
  type SeekGuardState,
} from "@/lib/seekGuard";

/** Plays from `from` to `to` in 0.25s ticks at 1x, returning the final state and any corrections. */
function play(state: SeekGuardState, from: number, to: number, startMs: number) {
  let s = state;
  const corrections: number[] = [];
  let now = startMs;
  for (let t = from; t <= to + 1e-9; t += 0.25) {
    const r = onTimeUpdate(s, Number(t.toFixed(2)), now);
    s = r.state;
    if (r.correctTo !== null) corrections.push(r.correctTo);
    now += 250;
  }
  return { state: s, corrections, now };
}

test("ordinary playback from the start advances the furthest point", () => {
  const { state, corrections } = play(createSeekGuard(), 0.25, 30, 1000);
  assert.deepEqual(corrections, []);
  assert.equal(state.furthest, 30);
});

test("a forward seek past the furthest point is corrected (seeking, then seeked)", () => {
  const start = play(createSeekGuard(), 0.25, 10, 0);
  let state = start.state;
  const now = start.now;
  let r = onSeeking(state, 120, now);
  assert.equal(r.correctTo, 10);
  r = onSeeked(r.state, 120, now + 50);
  assert.equal(r.correctTo, null, "same correction is not re-issued within the dedupe window");
  state = r.state;
  assert.equal(state.furthest, 10, "the jump never counts as watched");
});

test("a forward jump seen only via timeupdate (no seek events) is still corrected", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  const r = onTimeUpdate(state, 75, now);
  assert.equal(r.correctTo, 10);
  assert.equal(r.state.furthest, 10);
});

test("the corrective seek itself doesn't loop", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  let r = onSeeking(state, 60, now);
  assert.equal(r.correctTo, 10);
  // Our setCurrentTime(10) triggers its own seeking/seeked/timeupdate at the target.
  r = onSeeking(r.state, 10, now + 100);
  assert.equal(r.correctTo, null);
  r = onSeeked(r.state, 10, now + 200);
  assert.equal(r.correctTo, null);
  r = onTimeUpdate(r.state, 10.25, now + 450);
  assert.equal(r.correctTo, null);
  assert.equal(r.state.furthest, 10.25, "playback resumes extending the watched point");
});

test("backward seeking and replay are always allowed and keep the furthest point", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 40, 0);
  let r = onSeeking(state, 5, now);
  assert.equal(r.correctTo, null);
  r = onSeeked(r.state, 5, now + 50);
  assert.equal(r.correctTo, null);
  const replay = play(r.state, 5.25, 39.75, now + 300);
  assert.deepEqual(replay.corrections, []);
  assert.equal(replay.state.furthest, 40);
  // Continuing past the old frontier extends it again.
  const beyond = play(replay.state, 40, 45, replay.now);
  assert.deepEqual(beyond.corrections, []);
  assert.equal(beyond.state.furthest, 45);
});

test("small jitter within the tolerance is not corrected", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  const r = onSeeked(onSeeking(state, 10 + SEEK_TOLERANCE_SECONDS - 0.1, now).state, 11.9, now + 50);
  assert.equal(r.correctTo, null);
});

test("repeated small forward seeks can't ratchet the furthest point ahead", () => {
  let { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  let corrected = false;
  for (let i = 0; i < 5; i++) {
    const target = state.furthest + 1.9;
    let r = onSeeking(state, target, now);
    r = onSeeked(r.state, target, now + 50);
    const p = play(r.state, target + 0.25, target + 1, now + 300);
    if (p.corrections.length > 0) corrected = true;
    state = p.state;
    now = p.now;
  }
  assert.ok(state.furthest <= 10.5, `furthest stayed near 10, got ${state.furthest}`);
  assert.ok(corrected, "playing on from inside the tolerance band is eventually snapped back");
});

test("a resume position beyond the watched point on first load is corrected to the start", () => {
  const r = onTimeUpdate(createSeekGuard(), 300, 0);
  assert.equal(r.correctTo, 0);
});

test("buffering stalls and pauses don't count as progress or trigger corrections", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  // 30s of wall clock with no position change (stalled / paused), then playback resumes.
  let r = onTimeUpdate(state, 10, now + 30_000);
  assert.equal(r.correctTo, null);
  assert.equal(r.state.furthest, 10);
  r = onTimeUpdate(r.state, 10.25, now + 30_250);
  assert.equal(r.correctTo, null);
  assert.equal(r.state.furthest, 10.25);
});

test("throttled background ticks and up to 2x speed still count as watched", () => {
  let state = play(createSeekGuard(), 0.25, 5, 0).state;
  const now = 20_000;
  state = onTimeUpdate(state, 5, now).state;
  for (let i = 1; i <= 5; i++) {
    const r = onTimeUpdate(state, 5 + i * 2, now + i * 1000); // 2x speed, one tick per second
    assert.equal(r.correctTo, null);
    state = r.state;
  }
  assert.equal(state.furthest, 15);
});

test("ticks during an active seek don't extend the furthest point", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  let r = onSeeking(state, 11, now);
  r = onTimeUpdate(r.state, 11, now + 100);
  assert.equal(r.state.furthest, 10);
});

test("a seek whose seeked event never arrives stops blocking progress after a while", () => {
  const { state, now } = play(createSeekGuard(), 0.25, 10, 0);
  let r = onSeeking(state, 10, now);
  r = onTimeUpdate(r.state, 10.25, now + 6000);
  r = onTimeUpdate(r.state, 10.5, now + 6250);
  assert.equal(r.state.furthest, 10.5);
});

test("non-finite positions are ignored", () => {
  const s = createSeekGuard();
  assert.equal(onTimeUpdate(s, Number.NaN, 0).correctTo, null);
  assert.equal(onSeeking(s, Number.POSITIVE_INFINITY, 0).correctTo, null);
  assert.equal(onSeeked(s, Number.NaN, 0).correctTo, null);
});
