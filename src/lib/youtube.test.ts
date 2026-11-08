import { test } from "node:test";
import assert from "node:assert/strict";
import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl, parseYouTubeReference } from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";

test("watch, share, shorts, live and embed URLs all yield the video ID", () => {
  for (const input of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}?si=abcdef`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}?si=x`,
    `https://www.youtube.com/embed/${ID}?start=10`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  youtu.be/${ID}  `,
    `www.youtube.com/watch?v=${ID}`,
  ]) {
    assert.deepEqual(parseYouTubeReference(input), { ok: true, videoId: ID }, input);
  }
});

test("an embed iframe snippet yields the video ID", () => {
  const snippet = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=x" title="YouTube video player" allowfullscreen></iframe>`;
  assert.deepEqual(parseYouTubeReference(snippet), { ok: true, videoId: ID });
});

test("non-YouTube input returns null so the caller can try Bunny", () => {
  for (const input of [
    "",
    "   ",
    "https://iframe.mediadelivery.net/embed/123456/0f8e2a4c-1b3d-4e5f-8a9b-0c1d2e3f4a5b",
    "0f8e2a4c-1b3d-4e5f-8a9b-0c1d2e3f4a5b",
    "https://vimeo.com/123456",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "not a url",
  ]) {
    assert.equal(parseYouTubeReference(input), null, input);
  }
});

test("a YouTube URL without a usable video ID is rejected, not ignored", () => {
  for (const input of [
    "https://www.youtube.com/",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/@channel",
    "https://www.youtube.com/playlist?list=PL123",
    "https://youtu.be/",
    `https://user:pass@www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com:8443/watch?v=${ID}`,
    `ftp://www.youtube.com/watch?v=${ID}`,
  ]) {
    assert.deepEqual(parseYouTubeReference(input), { ok: false }, input);
  }
});

test("embed URL is rebuilt on the privacy-enhanced host", () => {
  assert.equal(buildYouTubeEmbedUrl(ID), `https://www.youtube-nocookie.com/embed/${ID}?rel=0&playsinline=1`);
});

test("guarded embed URL enables the player API for the page origin", () => {
  const url = new URL(buildYouTubeEmbedUrl(ID, { jsApiOrigin: "https://www.benyashind.com" }));
  assert.equal(url.searchParams.get("enablejsapi"), "1");
  assert.equal(url.searchParams.get("origin"), "https://www.benyashind.com");
  assert.equal(url.searchParams.get("disablekb"), "1");
});

test("builders refuse corrupted IDs", () => {
  assert.throws(() => buildYouTubeEmbedUrl("../../evil"));
  assert.throws(() => buildYouTubeWatchUrl("short"));
  assert.equal(buildYouTubeWatchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
});
