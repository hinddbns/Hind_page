import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBunnyEmbedUrl, parseBunnyReference } from "@/lib/bunny";

const VIDEO_ID = "0f8e2a4c-1b3d-4e5f-8a9b-0c1d2e3f4a5b";
const LIBRARY_ID = "123456";

test("bare video GUID with a library ID", () => {
  assert.deepEqual(parseBunnyReference(VIDEO_ID, LIBRARY_ID), { ok: true, libraryId: LIBRARY_ID, videoId: VIDEO_ID });
});

test("bare video GUID is normalized to lowercase", () => {
  assert.deepEqual(parseBunnyReference(` ${VIDEO_ID.toUpperCase()} `, LIBRARY_ID), {
    ok: true,
    libraryId: LIBRARY_ID,
    videoId: VIDEO_ID,
  });
});

test("bare video GUID without a library ID is rejected", () => {
  assert.deepEqual(parseBunnyReference(VIDEO_ID, ""), { ok: false, error: "missing_library_id" });
});

test("embed URL on both accepted hosts, with query string ignored", () => {
  for (const host of ["iframe.mediadelivery.net", "player.mediadelivery.net"]) {
    assert.deepEqual(parseBunnyReference(`https://${host}/embed/${LIBRARY_ID}/${VIDEO_ID}?autoplay=true&loop=false`), {
      ok: true,
      libraryId: LIBRARY_ID,
      videoId: VIDEO_ID,
    });
  }
});

test("play URL is accepted", () => {
  assert.deepEqual(parseBunnyReference(`https://iframe.mediadelivery.net/play/${LIBRARY_ID}/${VIDEO_ID}`), {
    ok: true,
    libraryId: LIBRARY_ID,
    videoId: VIDEO_ID,
  });
});

test("iframe embed snippet is accepted via its src only", () => {
  const snippet = `<iframe src="https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}?autoplay=true" loading="lazy" style="border:0;" allowfullscreen="true"></iframe>`;
  assert.deepEqual(parseBunnyReference(snippet), { ok: true, libraryId: LIBRARY_ID, videoId: VIDEO_ID });
});

test("matching library field alongside a URL is accepted, a different one is rejected", () => {
  const url = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}`;
  assert.equal(parseBunnyReference(url, LIBRARY_ID).ok, true);
  assert.deepEqual(parseBunnyReference(url, "999"), { ok: false, error: "library_id_mismatch" });
});

test("empty reference is a valid draft without a video", () => {
  assert.deepEqual(parseBunnyReference("", ""), { ok: true, libraryId: null, videoId: null });
  assert.deepEqual(parseBunnyReference("   ", LIBRARY_ID), { ok: true, libraryId: LIBRARY_ID, videoId: null });
});

test("malformed library IDs are rejected", () => {
  for (const library of ["abc", "0", "012", "12345678901", "12 3", "-1"]) {
    assert.deepEqual(parseBunnyReference(VIDEO_ID, library), { ok: false, error: "invalid_library_id" }, library);
  }
  assert.deepEqual(parseBunnyReference(`https://iframe.mediadelivery.net/embed/abc/${VIDEO_ID}`), {
    ok: false,
    error: "invalid_library_id",
  });
});

test("malformed video GUIDs are rejected", () => {
  assert.deepEqual(parseBunnyReference("0f8e2a4c-1b3d-4e5f-8a9b-0c1d2e3f4a5", LIBRARY_ID), {
    ok: false,
    error: "invalid_video_id",
  });
  assert.deepEqual(parseBunnyReference(`https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/not-a-guid`), {
    ok: false,
    error: "invalid_video_id",
  });
});

test("non-Bunny and look-alike hosts are rejected", () => {
  for (const host of [
    "evil.example.com",
    "mediadelivery.net",
    "iframe.mediadelivery.net.evil.com",
    "eviliframe.mediadelivery.net",
    "video.bunnycdn.com",
    "iframe.mediadelivery.net.",
  ]) {
    assert.deepEqual(
      parseBunnyReference(`https://${host}/embed/${LIBRARY_ID}/${VIDEO_ID}`),
      { ok: false, error: "unsupported_url" },
      host
    );
  }
});

test("credentials, ports and non-https schemes are rejected", () => {
  for (const url of [
    `https://user:pass@iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}`,
    `https://user@iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}`,
    `https://iframe.mediadelivery.net:8443/embed/${LIBRARY_ID}/${VIDEO_ID}`,
    `http://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}`,
    `ftp://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}`,
  ]) {
    assert.deepEqual(parseBunnyReference(url), { ok: false, error: "unsupported_url" }, url);
  }
});

test("unsupported URL structures and arbitrary input are rejected", () => {
  for (const input of [
    `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}`,
    `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}/extra`,
    `https://iframe.mediadelivery.net/watch/${LIBRARY_ID}/${VIDEO_ID}`,
    `https://iframe.mediadelivery.net/`,
    "https://www.youtube.com/watch?v=abc",
    "hello world",
    "<iframe></iframe>",
    "<script>alert(1)</script>",
    "x".repeat(3000),
  ]) {
    assert.deepEqual(parseBunnyReference(input), { ok: false, error: "unsupported_url" }, input.slice(0, 60));
  }
});

test("malicious schemes and iframe sources are rejected", () => {
  for (const input of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    `<iframe src="javascript:alert(1)"></iframe>`,
    `<iframe src="https://evil.example.com/embed/${LIBRARY_ID}/${VIDEO_ID}"></iframe>`,
  ]) {
    assert.deepEqual(parseBunnyReference(input), { ok: false, error: "unsupported_url" }, input);
  }
});

test("embed URL is rebuilt on the fixed host with fixed parameters", () => {
  assert.equal(
    buildBunnyEmbedUrl({ libraryId: LIBRARY_ID, videoId: VIDEO_ID }),
    `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${VIDEO_ID}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`
  );
});

test("embed URL builder refuses invalid identifiers", () => {
  assert.throws(() => buildBunnyEmbedUrl({ libraryId: "abc", videoId: VIDEO_ID }));
  assert.throws(() => buildBunnyEmbedUrl({ libraryId: LIBRARY_ID, videoId: "../../evil" }));
});
