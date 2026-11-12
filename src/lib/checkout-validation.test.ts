import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkoutSessionSchema, parseVerifiedCheckout, assertCheckoutOwner, bindCheckoutEmail } from "./checkout-validation";
import { verifyCheckout } from "./checkout.server";

const verified = { valid: true, email: "customer@example.com", livemode: false, subscription_status: "trialing" };

describe("Checkout safeguards", () => {
  it("rejects a missing session ID", () => {
    assert.equal(checkoutSessionSchema.safeParse("").success, false);
  });
  it("rejects malformed and live sessions", () => {
    for (const value of ["invalid", "cs_live_123", "cs_test_"]) assert.equal(checkoutSessionSchema.safeParse(value).success, false);
  });
  it("accepts a sandbox session with a verified active trial", async () => {
    const result = await verifyCheckout("cs_test_SandboxExample", async () => Response.json(verified));
    assert.equal(result.email, "customer@example.com");
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