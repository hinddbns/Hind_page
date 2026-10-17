import { test } from "node:test";
import assert from "node:assert/strict";
import {
  freeCoursePath,
  getAccessLinkStatus,
  isValidAccessCode,
  isValidAccessDate,
  normalizeAccessCode,
  todayInAccessTimeZone,
} from "@/lib/freeCourseAccess";

test("group names are normalized: trimmed, lowercased, spaces to hyphens", () => {
  assert.equal(normalizeAccessCode("  Groupe Octobre "), "groupe-octobre");
  assert.equal(normalizeAccessCode("OCT-2026"), "oct-2026");
});

test("valid and invalid group names", () => {
  for (const ok of ["oct", "groupe-octobre", "groupe-2026-10", "a1b"]) assert.equal(isValidAccessCode(ok), true, ok);
  for (const bad of ["", "ab", "-abc", "abc-", "a--b", "abc_def", "مجموعة", "a b", "a".repeat(41), "abc/../x", "abc?x=1"]) {
    assert.equal(isValidAccessCode(bad), false, bad);
  }
  assert.equal(isValidAccessCode("a".repeat(40)), true);
});

test("dates must be real calendar dates", () => {
  assert.equal(isValidAccessDate("2026-10-25"), true);
  assert.equal(isValidAccessDate("2028-02-29"), true);
  for (const bad of ["2026-02-30", "2026-13-01", "25/10/2026", "2026-1-5", "", "2026-10-25T00:00"]) {
    assert.equal(isValidAccessDate(bad), false, bad);
  }
});

test("today is computed in Morocco time, not UTC", () => {
  // 23:30 UTC on Oct 17 is already Oct 18 in Casablanca (UTC+1 at that date).
  assert.equal(todayInAccessTimeZone(new Date("2026-10-17T23:30:00Z")), "2026-10-18");
  assert.equal(todayInAccessTimeZone(new Date("2026-10-17T10:00:00Z")), "2026-10-17");
});

const course = { accessCode: "groupe-octobre", accessExpiresOn: "2026-10-25" };
const day = (iso: string) => new Date(iso);

test("the current code opens the page until the end of its expiry day", () => {
  assert.equal(getAccessLinkStatus(course, "groupe-octobre", day("2026-10-20T12:00:00Z")), "open");
  assert.equal(getAccessLinkStatus(course, "groupe-octobre", day("2026-10-25T21:00:00Z")), "open");
  assert.equal(getAccessLinkStatus(course, "groupe-octobre", day("2026-10-26T00:30:00Z")), "expired");
});

test("an old or wrong code never opens the page", () => {
  assert.equal(getAccessLinkStatus(course, "groupe-septembre", day("2026-10-20T12:00:00Z")), "wrongCode");
  assert.equal(getAccessLinkStatus(course, "", day("2026-10-20T12:00:00Z")), "wrongCode");
});

test("the requested code is matched case-insensitively", () => {
  assert.equal(getAccessLinkStatus(course, "Groupe-Octobre", day("2026-10-20T12:00:00Z")), "open");
});

test("no expiry date means no end; no code means closed", () => {
  assert.equal(getAccessLinkStatus({ ...course, accessExpiresOn: null }, "groupe-octobre", day("2030-01-01T00:00:00Z")), "open");
  assert.equal(getAccessLinkStatus({ accessCode: null, accessExpiresOn: null }, "anything", day("2026-10-20T12:00:00Z")), "noCode");
});

test("paths are built from the base and an encoded code", () => {
  assert.equal(freeCoursePath("groupe-octobre"), "/free-course/groupe-octobre");
});
