import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkoutSessionSchema, parseVerifiedCheckout, assertCheckoutOwner, bindCheckoutEmail } from "./checkout-validation";
import { configuredVerifiers, verifyCheckout, verifyEmail } from "./checkout.server";

const verified = { valid: true, email: "customer@example.com", livemode: true, subscription_status: "trialing" };
const HUB = "https://genisys-hub.onrender.com/api/public/checkout-verify";
const SIGNUP = "https://qlviirvjbiopltrqucej.supabase.co/functions/v1/verify-checkout-session";
const KEYS = ["HUB_VERIFICATION_KEY", "ONBOARDING_VERIFICATION_KEY"] as const;

/** A fetcher that answers per verifier and records who was asked. */
function answering(plan: Record<string, () => Response | Promise<Response>>) {
  const asked: string[] = [];
  const fetcher = (async (url: RequestInfo | URL, options?: RequestInit) => {
    const u = String(url);
    asked.push(u === HUB ? "hub" : u === SIGNUP ? "signup" : u);
    assert.equal(options?.method, "POST");
    assert.equal(new Headers(options?.headers).get("Content-Type"), "application/json");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    const answer = plan[u];
    if (!answer) throw new Error(`unexpected verifier ${u}`);
    return answer();
  }) as typeof fetch;
  return { fetcher, asked };
}

describe("Checkout safeguards", () => {
  const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  before(() => { process.env["HUB_VERIFICATION_KEY"] = "hub-test-key"; process.env["ONBOARDING_VERIFICATION_KEY"] = "signup-test-key"; });
  after(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });
  it("rejects a missing or malformed session ID, takes test and live ones", () => {
    for (const value of ["", "invalid", "cs_test_", "cs_live_abc/../x", "sub_123"]) assert.equal(checkoutSessionSchema.safeParse(value).success, false, value);
    for (const value of ["cs_test_SandboxExample", "cs_live_a1B2c3D4e5"]) assert.equal(checkoutSessionSchema.safeParse(value).success, true, value);
  });
  it("asks the Hub first, with the Hub's password and the session id", async () => {
    const { fetcher, asked } = answering({
      [HUB]: () => Response.json(verified),
    });
    const result = await verifyCheckout("cs_live_Example", async (url, options) => {
      assert.equal(new Headers(options?.headers).get("x-onboarding-key"), "hub-test-key");
      assert.deepEqual(JSON.parse(String(options?.body)), { session_id: "cs_live_Example" });
      return fetcher(url, options);
    });
    assert.equal(result.email, "customer@example.com");
    assert.deepEqual(asked, ["hub"]);
  });
  it("falls back to the signup site's verifier when the Hub can't answer (down, broken, or no password here)", async () => {
    for (const hubAnswer of [() => Response.json({ error: "private" }, { status: 503 }), () => Response.json({ error: "private" }, { status: 500 }), () => { throw new Error("private-transport-detail"); }, () => Response.json({ valid: true, email: "not-an-email", subscription_status: "trialing" })]) {
      const { fetcher, asked } = answering({ [HUB]: hubAnswer, [SIGNUP]: () => Response.json({ valid: true, email: "customer@example.com", subscription_status: "trialing" }) });
      const result = await verifyCheckout("cs_live_Example", async (url, options) => {
        if (String(url) === SIGNUP) assert.equal(new Headers(options?.headers).get("x-onboarding-key"), "signup-test-key");
        return fetcher(url, options);
      });
      assert.equal(result.email, "customer@example.com");
      assert.deepEqual(asked, ["hub", "signup"]);
    }
    delete process.env["HUB_VERIFICATION_KEY"];
    try {
      const { fetcher, asked } = answering({ [SIGNUP]: () => Response.json(verified) });
      await verifyCheckout("cs_live_Example", fetcher);
      assert.deepEqual(asked, ["signup"], "a Hub with no password here isn't contacted");
    } finally { process.env["HUB_VERIFICATION_KEY"] = "hub-test-key"; }
  });
  it("a wrong password is not an answer either: the next verifier is asked, and nothing from the provider leaks", async () => {
    const { fetcher, asked } = answering({ [HUB]: () => Response.json({ error: "private-provider-detail" }, { status: 401 }), [SIGNUP]: () => Response.json({ error: "private-provider-detail" }, { status: 401 }) });
    await assert.rejects(verifyCheckout("cs_live_Example", fetcher), /temporarily unavailable/);
    assert.deepEqual(asked, ["hub", "signup"]);
  });
  it("a clear no is believed only once every verifier has had its say", async () => {
    const both = answering({ [HUB]: () => Response.json({ valid: false }, { status: 403 }), [SIGNUP]: () => Response.json({ valid: false }, { status: 403 }) });
    await assert.rejects(verifyCheckout("cs_live_Unknown", both.fetcher), /We couldn't confirm this checkout/);
    assert.deepEqual(both.asked, ["hub", "signup"]);
    const second = answering({ [HUB]: () => Response.json({ valid: false }, { status: 403 }), [SIGNUP]: () => Response.json(verified) });
    assert.equal((await verifyCheckout("cs_live_Example", second.fetcher)).email, "customer@example.com");
    await assert.rejects(verifyCheckout("cs_test_InvalidExample", answering({ [HUB]: () => Response.json({ valid: false }, { status: 404 }), [SIGNUP]: () => Response.json({ valid: false }, { status: 404 }) }).fetcher), /We couldn't confirm this checkout/);
  });
  it("says which verifiers this server can ask, by name only", () => {
    assert.deepEqual(configuredVerifiers(), ["hub", "signup"]);
    delete process.env["HUB_VERIFICATION_KEY"];
    try { assert.deepEqual(configuredVerifiers(), ["signup"]); } finally { process.env["HUB_VERIFICATION_KEY"] = "hub-test-key"; }
  });
  it("keeps a trail of who was asked and how it went: names and statuses only", async () => {
    const trail: string[] = [];
    await assert.rejects(verifyCheckout("cs_live_Example", answering({ [HUB]: () => Response.json({ error: "private" }, { status: 503 }), [SIGNUP]: () => Response.json({ valid: false }, { status: 403 }) }).fetcher, trail));
    assert.deepEqual(trail, ["hub:503", "signup:403"]);
    const okTrail: string[] = [];
    await verifyCheckout("cs_live_Example", answering({ [HUB]: () => { throw new Error("private-transport-detail"); }, [SIGNUP]: () => Response.json(verified) }).fetcher, okTrail);
    assert.deepEqual(okTrail, ["hub:unreachable", "signup:ok"]);
  });
  it("does not contact anyone when no verifier key is set here", async () => {
    for (const k of KEYS) delete process.env[k];
    let contacted = false;
    try {
      await assert.rejects(verifyCheckout("cs_test_SandboxExample", async () => { contacted = true; return Response.json(verified); }), /temporarily unavailable/);
      assert.equal(contacted, false);
    } finally { process.env["HUB_VERIFICATION_KEY"] = "hub-test-key"; process.env["ONBOARDING_VERIFICATION_KEY"] = "signup-test-key"; }
  });
  it("hides transport error details", async () => {
    await assert.rejects(verifyCheckout("cs_test_SandboxExample", async () => { throw new Error("private-transport-detail"); }), /temporarily unavailable/);
  });
  it("an email alone is asked of the Hub only", async () => {
    const { fetcher, asked } = answering({ [HUB]: () => Response.json(verified) });
    const result = await verifyEmail("  Customer@Example.com ", async (url, options) => {
      assert.deepEqual(JSON.parse(String(options?.body)), { email: "customer@example.com" });
      return fetcher(url, options);
    });
    assert.equal(result.subscription_status, "trialing");
    assert.deepEqual(asked, ["hub"]);
    await assert.rejects(verifyEmail("not-an-email", fetcher), /We couldn't confirm this checkout/);
    await assert.rejects(verifyEmail("nobody@example.com", answering({ [HUB]: () => Response.json({ valid: false }, { status: 403 }) }).fetcher), /We couldn't confirm this checkout/);
  });
  it("accepts the minimal verified response, with or without livemode", async () => {
    for (const body of [{ valid: true, email: "customer@example.com", subscription_status: "trialing" }, { ...verified, livemode: false }, { ...verified, name: "Maria Lopez", trial_end: "2026-12-17T15:00:00.000Z" }]) {
      const result = await verifyCheckout("cs_test_SandboxExample", async () => Response.json(body));
      assert.equal(result.email, "customer@example.com");
    }
  });
  it("rejects unconfirmed trials and ended subscriptions", () => {
    for (const value of [{ ...verified, valid: false }, { ...verified, subscription_status: "canceled" }, { ...verified, email: null }]) {
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
