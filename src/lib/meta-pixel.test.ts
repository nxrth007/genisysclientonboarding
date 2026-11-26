import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanPixelUrl, META_PIXEL_ID, updateMetaPixel } from "./meta-pixel";
import { canTrack } from "./consent";

describe("Meta Pixel privacy gates", () => {
  const saved = new Map<string, string>();
  const scripts: unknown[] = [];
  const calls: unknown[][] = [];
  const location = { href: "https://example.com/?session_id=cs_test_private", pathname: "/", hostname: "example.com" };
  const browser = {
    location,
    consentAskEverywhere: true,
    history: { state: {}, replaceState: (_state: unknown, _title: string, url: string) => { location.href = url; } },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { globalPrivacyControl: false } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    referrer: "", createElement: () => ({}), head: { appendChild: (script: unknown) => scripts.push(script) },
  } });
  function choose(choice: string) { saved.set("cookie_consent_advertising", JSON.stringify({ choice, at: Date.now() })); }

  it("uses the requested dataset ID", () => assert.equal(META_PIXEL_ID, "1012489854984901"));
  it("strips session IDs and tokens from event page URLs", () => {
    assert.equal(cleanPixelUrl("https://example.com/?session_id=cs_test_private#access_token=secret"), "https://example.com/");
  });
  it("does not initialize or load Meta without regional permission", async () => {
    assert.equal(await canTrack("advertising"), false);
    await updateMetaPixel();
    assert.equal(scripts.length, 0);
    assert.equal(window.fbq, undefined);
  });
  it("blocks explicit refusal", async () => {
    choose("denied");
    await updateMetaPixel();
    assert.equal(scripts.length, 0);
  });
  it("blocks Global Privacy Control even with acceptance", async () => {
    choose("granted");
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { globalPrivacyControl: true } });
    await updateMetaPixel();
    assert.equal(scripts.length, 0);
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { globalPrivacyControl: false } });
  });
  it("leaves auth callback tokens untouched and sends nothing", async () => {
    location.href = "https://example.com/#access_token=private";
    await updateMetaPixel();
    assert.equal(location.href, "https://example.com/#access_token=private");
    assert.equal(scripts.length, 0);
  });
  it("initializes ID-only, disables auto collection, and deduplicates page visits", async () => {
    location.href = "https://example.com/?session_id=cs_test_private";
    await updateMetaPixel();
    assert.equal(location.href, "https://example.com/");
    assert.equal(scripts.length, 1);
    assert.ok(window.fbq);
    calls.push(...window.fbq.queue);
    assert.deepEqual(calls.find((call) => call[0] === "init"), ["init", "1012489854984901", {}, { agent: "lovable" }]);
    assert.deepEqual(calls.find((call) => call[0] === "set"), ["set", "autoConfig", false, "1012489854984901"]);
    await updateMetaPixel();
    assert.equal(window.fbq.queue.filter((call) => call[0] === "trackSingle").length, 1);
    assert.ok(!JSON.stringify(window.fbq.queue).includes("cs_test_private"));
  });
  it("revokes immediately after withdrawal", async () => {
    choose("denied");
    await updateMetaPixel();
    assert.deepEqual(window.fbq?.queue.at(-1), ["consent", "revoke"]);
  });
});