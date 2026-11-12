import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkoutSessionSchema, parseVerifiedCheckout, assertCheckoutOwner, bindCheckoutEmail } from "./checkout-validation";
import { verifyCheckout } from "./checkout.server";

const verified = { valid: true, email: "customer@example.com", livemode: false, subscription_status: "trialing" };

describe("Checkout safeguards", () => {
  const originalKey = process.env["ONBOARDING_VERIFICATION_KEY"];
  before(() => { process.env["ONBOARDING_VERIFICATION_KEY"] = "test-only-verification-key"; });
  after(() => {
    if (originalKey === undefined) delete process.env["ONBOARDING_VERIFICATION_KEY"];
    else process.env["ONBOARDING_VERIFICATION_KEY"] = originalKey;
  });
  it("rejects a missing session ID", () => {
    assert.equal(checkoutSessionSchema.safeParse("").success, false);
  });
  it("rejects malformed and live sessions", () => {
    for (const value of ["invalid", "cs_live_123", "cs_test_"]) assert.equal(checkoutSessionSchema.safeParse(value).success, false);
  });
  it("accepts a sandbox session with a verified active trial", async () => {
    const result = await verifyCheckout("cs_test_SandboxExample", async (url, options) => {
      assert.equal(url, "https://qlviirvjbiopltrqucej.supabase.co/functions/v1/verify-checkout-session");
      assert.equal(options?.method, "POST");
      assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
      assert.equal(new Headers(options?.headers).get("x-onboarding-key") === process.env["ONBOARDING_VERIFICATION_KEY"], true);
      assert.deepEqual(JSON.parse(String(options?.body)), { session_id: "cs_test_SandboxExample" });
      assert.equal(options?.redirect, "error");
      assert.equal(options?.cache, "no-store");
      return Response.json(verified);
    });
    assert.equal(result.email, "customer@example.com");
  });
  it("rejects incorrect keys without exposing provider responses", async () => {
    await assert.rejects(verifyCheckout("cs_test_SandboxExample", async () => Response.json({ error: "private-provider-detail" }, { status: 401 })), /We couldn't confirm this checkout/);
  });
  it("does not contact the endpoint when the server key is missing", async () => {
    delete process.env["ONBOARDING_VERIFICATION_KEY"];
    let contacted = false;
    try {
      await assert.rejects(verifyCheckout("cs_test_SandboxExample", async () => { contacted = true; return Response.json(verified); }), /temporarily unavailable/);
      assert.equal(contacted, false);
    } finally { process.env["ONBOARDING_VERIFICATION_KEY"] = "test-only-verification-key"; }
  });
  it("hides transport error details", async () => {
    await assert.rejects(verifyCheckout("cs_test_SandboxExample", async () => { throw new Error("private-transport-detail"); }), /We couldn't confirm this checkout/);
  });
  it("rejects a failed verification endpoint response", async () => {
    await assert.rejects(verifyCheckout("cs_test_InvalidExample", async () => Response.json({ valid: false }, { status: 404 })));
  });
  it("rejects unconfirmed trials and live endpoint results", () => {
    for (const value of [{ ...verified, valid: false }, { ...verified, livemode: true }, { ...verified, subscription_status: "canceled" }]) {
      assert.throws(() => parseVerifiedCheckout(value));
    }
  });
  it("blocks another customer's confirmed email", () => {
    assert.throws(() => assertCheckoutOwner("customer@example.com", "other@example.com", "2026-11-12"));
  });
  it("requires confirmation even when the email matches", () => {
    assert.throws(() => assertCheckoutOwner("customer@example.com", "customer@example.com", undefined));
  });
  it("allows only the matching confirmed email", () => {
    assert.doesNotThrow(() => assertCheckoutOwner("Customer@Example.com", "customer@example.com", "2026-11-12"));
  });
  it("uses the verified Stripe email rather than the manually entered email", () => {
    assert.deepEqual(bindCheckoutEmail({ fullName: "Customer", leadEmail: "manual@example.com" }, "Customer@Example.com"), { fullName: "Customer", leadEmail: "customer@example.com" });
  });
});