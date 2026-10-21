import { test } from "node:test";
import assert from "node:assert/strict";
import { PLACEHOLDER_WHATSAPP_NUMBER, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";

test("valid number builds a wa.me link", () => {
  assert.equal(buildWhatsAppUrl("212612345678"), "https://wa.me/212612345678");
});

test("formatting characters are stripped before validation", () => {
  assert.equal(normalizeWhatsAppNumber("+212 (612) 34-56-78"), "212612345678");
  assert.equal(buildWhatsAppUrl(" +212 612 345 678 "), "https://wa.me/212612345678");
});

test("missing or malformed numbers produce no link", () => {
  for (const value of [null, undefined, "", "   ", "abc", "1234567", "1234567890123456", "212-61x-345678"]) {
    assert.equal(buildWhatsAppUrl(value), null, String(value));
  }
});

test("the placeholder default produces no link", () => {
  assert.equal(buildWhatsAppUrl(PLACEHOLDER_WHATSAPP_NUMBER), null);
  assert.equal(buildWhatsAppUrl("+212 600 000 000"), null);
});

test("no injection into the URL", () => {
  assert.equal(buildWhatsAppUrl("212612345678?text=hi"), null);
  assert.equal(buildWhatsAppUrl("212612345678/../evil"), null);
});

test("a pre-filled message is URL-encoded into the text parameter", () => {
  assert.equal(buildWhatsAppUrl("212612345678", "مرحبا & hi"), `https://wa.me/212612345678?text=${encodeURIComponent("مرحبا & hi")}`);
  assert.equal(buildWhatsAppUrl(PLACEHOLDER_WHATSAPP_NUMBER, "x"), null);
});
