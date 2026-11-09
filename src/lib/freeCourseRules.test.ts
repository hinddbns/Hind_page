import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_COURSE_LIMITS,
  getContentProblems,
  getFreeCourseVideo,
  getPublishBlockers,
  isPublishable,
  normalizeFreeCourseContent,
  resolveFreeCourseView,
  splitParagraphs,
  summarize,
  type FreeCourseContent,
} from "@/lib/freeCourseRules";

const complete: FreeCourseContent = {
  title: "عنوان الدورة",
  eyebrow: null,
  introduction: "مقدمة قصيرة.",
  bunnyLibraryId: "123456",
  bunnyVideoId: "0f8e2a4c-1b3d-4e5f-8a9b-0c1d2e3f4a5b",
  videoAspect: "LANDSCAPE",
  allowSkipping: true,
  showHost: true,
  hostIntro: null,
  seoTitle: null,
  seoDescription: null,
  indexable: false,
  accessCode: "groupe-octobre",
  accessExpiresOn: null,
};

test("complete content with every optional field omitted is publishable", () => {
  assert.deepEqual(getContentProblems(complete), []);
  assert.deepEqual(getPublishBlockers(complete), []);
  assert.equal(isPublishable(complete), true);
});

test("empty or whitespace-only title blocks publication", () => {
  assert.deepEqual(getPublishBlockers({ ...complete, title: "   " }), ["titleRequired"]);
});

test("empty introduction blocks publication", () => {
  assert.deepEqual(getPublishBlockers({ ...complete, introduction: "" }), ["introductionRequired"]);
});

test("missing library ID or video ID blocks publication", () => {
  assert.deepEqual(getPublishBlockers({ ...complete, bunnyLibraryId: null }), ["videoRequired"]);
  assert.deepEqual(getPublishBlockers({ ...complete, bunnyVideoId: null }), ["videoRequired"]);
});

test("invalid stored identifiers block publication and are content problems", () => {
  const bad = { ...complete, bunnyLibraryId: "12a", bunnyVideoId: "nope" };
  assert.deepEqual(getPublishBlockers(bad), ["videoRequired"]);
  assert.deepEqual(getContentProblems(bad), ["invalidLibraryId", "invalidVideoId"]);
  assert.equal(isPublishable(bad), false);
});

const youtubeOnly = { ...complete, bunnyLibraryId: null, bunnyVideoId: null, youtubeVideoId: "dQw4w9WgXcQ" };

test("a YouTube video alone satisfies the video requirement", () => {
  assert.deepEqual(getContentProblems(youtubeOnly), []);
  assert.deepEqual(getPublishBlockers(youtubeOnly), []);
  assert.deepEqual(getFreeCourseVideo(youtubeOnly), { provider: "youtube", videoId: "dQw4w9WgXcQ" });
});

test("Bunny stays the source when no YouTube ID is stored (incl. rows read before the migration)", () => {
  const video = { provider: "bunny", libraryId: complete.bunnyLibraryId, videoId: complete.bunnyVideoId };
  assert.deepEqual(getFreeCourseVideo(complete), video);
  assert.deepEqual(getFreeCourseVideo({ ...complete, youtubeVideoId: null }), video);
});

test("an invalid YouTube ID blocks publication and is a content problem", () => {
  const bad = { ...youtubeOnly, youtubeVideoId: "nope" };
  assert.deepEqual(getContentProblems(bad), ["invalidVideoId"]);
  assert.deepEqual(getPublishBlockers(bad), ["videoRequired"]);
  assert.equal(getFreeCourseVideo(bad), null);
});

test("Bunny and YouTube together are refused", () => {
  assert.deepEqual(getContentProblems({ ...complete, youtubeVideoId: "dQw4w9WgXcQ" }), ["multipleVideoSources"]);
});

test("an empty draft is savable but not publishable", () => {
  const draft = { ...complete, title: "", introduction: "", bunnyLibraryId: null, bunnyVideoId: null };
  assert.deepEqual(getContentProblems(draft), []);
  assert.deepEqual(getPublishBlockers(draft), ["titleRequired", "introductionRequired", "videoRequired"]);
});

test("character limits are enforced at exactly limit + 1", () => {
  const at = (n: number) => "ب".repeat(n);
  assert.deepEqual(getContentProblems({ ...complete, title: at(FREE_COURSE_LIMITS.title) }), []);
  assert.deepEqual(getContentProblems({ ...complete, title: at(FREE_COURSE_LIMITS.title + 1) }), ["titleTooLong"]);
  assert.deepEqual(getContentProblems({ ...complete, eyebrow: at(FREE_COURSE_LIMITS.eyebrow + 1) }), ["eyebrowTooLong"]);
  assert.deepEqual(getContentProblems({ ...complete, introduction: at(FREE_COURSE_LIMITS.introduction + 1) }), [
    "introductionTooLong",
  ]);
  assert.deepEqual(getContentProblems({ ...complete, hostIntro: at(FREE_COURSE_LIMITS.hostIntro + 1) }), [
    "hostIntroTooLong",
  ]);
  assert.deepEqual(getContentProblems({ ...complete, seoTitle: at(FREE_COURSE_LIMITS.seoTitle + 1) }), [
    "seoTitleTooLong",
  ]);
  assert.deepEqual(getContentProblems({ ...complete, seoDescription: at(FREE_COURSE_LIMITS.seoDescription + 1) }), [
    "seoDescriptionTooLong",
  ]);
});

test("limits count code points like Postgres char_length", () => {
  assert.deepEqual(getContentProblems({ ...complete, eyebrow: "😀".repeat(FREE_COURSE_LIMITS.eyebrow) }), []);
});

test("invalid aspect ratio is a content problem", () => {
  assert.deepEqual(getContentProblems({ ...complete, videoAspect: "WIDE" as FreeCourseContent["videoAspect"] }), [
    "invalidVideoAspect",
  ]);
});

test("normalization keeps the allowSkipping toggle as given", () => {
  assert.equal(normalizeFreeCourseContent({ ...complete, allowSkipping: false }).allowSkipping, false);
  assert.equal(normalizeFreeCourseContent({ ...complete, allowSkipping: true }).allowSkipping, true);
});

test("normalization trims text and nulls empty optional fields", () => {
  const normalized = normalizeFreeCourseContent({
    ...complete,
    title: "  عنوان  ",
    eyebrow: "   ",
    introduction: "\n مقدمة \n",
    hostIntro: "",
    seoTitle: " عنوان البحث ",
    seoDescription: null,
  });
  assert.equal(normalized.title, "عنوان");
  assert.equal(normalized.eyebrow, null);
  assert.equal(normalized.introduction, "مقدمة");
  assert.equal(normalized.hostIntro, null);
  assert.equal(normalized.seoTitle, "عنوان البحث");
  assert.equal(normalized.seoDescription, null);
});

test("summarize keeps short text and cuts long text within the limit", () => {
  assert.equal(summarize("نص  قصير\nجدا"), "نص قصير جدا");
  const long = "كلمة ".repeat(100);
  const result = summarize(long);
  assert.ok(Array.from(result).length <= FREE_COURSE_LIMITS.seoDescription);
  assert.ok(result.endsWith("…"));
});

test("introduction limit is 1,200 characters", () => {
  assert.equal(FREE_COURSE_LIMITS.introduction, 1200);
  assert.deepEqual(getContentProblems({ ...complete, introduction: "ب".repeat(1200) }), []);
  assert.deepEqual(getContentProblems({ ...complete, introduction: "ب".repeat(1201) }), ["introductionTooLong"]);
});

test("normalization converts CRLF to LF and keeps inner line breaks", () => {
  const normalized = normalizeFreeCourseContent({
    ...complete,
    introduction: "\r\nسطر أول\r\nسطر ثاني\r\n\r\nفقرة ثانية 🤍\r\n",
    hostIntro: "وصف\r\nقصير",
  });
  assert.equal(normalized.introduction, "سطر أول\nسطر ثاني\n\nفقرة ثانية 🤍");
  assert.equal(normalized.hostIntro, "وصف\nقصير");
});

test("splitParagraphs splits on blank lines and keeps single newlines", () => {
  assert.deepEqual(splitParagraphs("أ\nب\n\nج"), ["أ\nب", "ج"]);
  assert.deepEqual(splitParagraphs("أ\r\n\r\nب"), ["أ", "ب"]);
  assert.deepEqual(splitParagraphs("أ\n   \n\n\nب"), ["أ", "ب"]);
  assert.deepEqual(splitParagraphs("  فقرة واحدة  "), ["فقرة واحدة"]);
  assert.deepEqual(splitParagraphs(""), []);
  assert.deepEqual(splitParagraphs("\n\n  \n"), []);
});

test("splitParagraphs returns plain text, untouched", () => {
  assert.deepEqual(splitParagraphs("<script>alert(1)</script>\n\n<b>x</b>"), ["<script>alert(1)</script>", "<b>x</b>"]);
});

test("a missing group name blocks publication", () => {
  assert.deepEqual(getPublishBlockers({ ...complete, accessCode: null }), ["accessCodeRequired"]);
});

test("invalid group names and expiry dates are content problems", () => {
  assert.deepEqual(getContentProblems({ ...complete, accessCode: "Bad Name!" }), ["invalidAccessCode"]);
  assert.deepEqual(getContentProblems({ ...complete, accessExpiresOn: "2026-02-30" }), ["invalidAccessDate"]);
  assert.deepEqual(getContentProblems({ ...complete, accessExpiresOn: "2026-10-25" }), []);
});

// Noon in Morocco on 2026-11-09.
const NOW = new Date("2026-11-09T11:00:00Z");
const live = { ...complete, id: "main", published: true, accessCode: "999" };
const draft = { ...complete, id: "3f2b6c1e-8d4a-4b7e-9c2d-1a5e6f7b8c9d", published: false, accessCode: "day2" };

test("a published page opens for anyone with its code", () => {
  assert.deepEqual(resolveFreeCourseView(live, "999", false, NOW), { course: live, preview: false, notice: null });
  assert.deepEqual(resolveFreeCourseView(live, "999", true, NOW), { course: live, preview: false, notice: null });
});

test("a draft is hidden from visitors and previewed by admins", () => {
  assert.equal(resolveFreeCourseView(draft, "day2", false, NOW), null);
  assert.deepEqual(resolveFreeCourseView(draft, "day2", true, NOW), { course: draft, preview: true, notice: "draft" });
});

test("a published but incomplete page counts as a draft", () => {
  const incomplete = { ...live, introduction: "" };
  assert.equal(resolveFreeCourseView(incomplete, "999", false, NOW), null);
  assert.equal(resolveFreeCourseView(incomplete, "999", true, NOW)?.notice, "draft");
});

test("an expired page is hidden from visitors and previewed by admins with a notice", () => {
  const expired = { ...live, accessExpiresOn: "2026-11-08" };
  assert.equal(resolveFreeCourseView(expired, "999", false, NOW), null);
  assert.deepEqual(resolveFreeCourseView(expired, "999", true, NOW), { course: expired, preview: true, notice: "expired" });
  // The end date itself is still valid.
  assert.equal(resolveFreeCourseView({ ...live, accessExpiresOn: "2026-11-09" }, "999", false, NOW)?.preview, false);
});

test("no page found means not found, for admins too", () => {
  assert.equal(resolveFreeCourseView(null, "unknown", false, NOW), null);
  assert.equal(resolveFreeCourseView(null, "unknown", true, NOW), null);
});

test("a page opens only through its own code, never its id or another page's code", () => {
  for (const isAdmin of [false, true]) {
    assert.equal(resolveFreeCourseView(live, "main", isAdmin, NOW), null);
    assert.equal(resolveFreeCourseView(live, "day2", isAdmin, NOW), null);
    assert.equal(resolveFreeCourseView(draft, draft.id, isAdmin, NOW), null);
    assert.equal(resolveFreeCourseView(draft, "999", isAdmin, NOW), null);
  }
});

test("a page without a code opens for nobody", () => {
  const noCode = { ...draft, accessCode: null };
  assert.equal(resolveFreeCourseView(noCode, "day2", true, NOW), null);
  assert.equal(resolveFreeCourseView(noCode, "", true, NOW), null);
});

test("the requested code is matched after normalization", () => {
  assert.equal(resolveFreeCourseView(draft, " DAY2 ", true, NOW)?.course, draft);
  assert.equal(resolveFreeCourseView(live, "999", false, NOW)?.course.id, "main");
});
