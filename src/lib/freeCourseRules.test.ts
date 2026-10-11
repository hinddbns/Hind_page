import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FREE_COURSE_LIMITS,
  getContentProblems,
  getPublishBlockers,
  isPublishable,
  normalizeFreeCourseContent,
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
  showHost: true,
  hostIntro: null,
  seoTitle: null,
  seoDescription: null,
  indexable: false,
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
