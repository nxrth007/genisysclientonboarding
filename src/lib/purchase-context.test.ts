import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isDeviceId } from "./device-id";
import { buildIntakeWebhookPayload } from "./intake-webhook.server";
import {
  BILLING_SUMMARY,
  CANCELLATION_POLICY_TEXT,
  POLICIES,
  POLICY_KEYS,
  REFUND_POLICY_TEXT,
  RECURRING_BILLING_TEXT,
  TERMS_TEXT,
} from "./policies";
import {
  acceptanceFlagsSchema,
  buildPurchaseContext,
  clientIpFromHeaders,
  textHash,
  USER_AGENT_LIMIT,
} from "./purchase-context.server";

const at = "2026-11-19T19:00:00.000Z";
const deviceId = "11111111-2222-4333-8444-555555555555";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("Policy text", () => {
  it("hashes the exact shown text as lowercase hex SHA-256", () => {
    for (const key of POLICY_KEYS) {
      const policy = POLICIES[key];
      const expected = createHash("sha256").update(policy.text, "utf8").digest("hex");
      assert.equal(textHash(policy.text), expected);
      assert.match(expected, /^[0-9a-f]{64}$/);
      assert.equal(policy.text.includes(policy.text.trim()), true);
    }
  });

  it("keeps the published terms, and marks the three new policies as drafts", () => {
    assert.match(TERMS_TEXT, /Last updated: August 6, 2026/);
    assert.match(TERMS_TEXT, /30 days written notice/);
    assert.match(TERMS_TEXT, /ethan@leadgenisys\.com/);
    assert.match(TERMS_TEXT, /Fees paid for the current service period are non-refundable/);
    assert.equal(TERMS_TEXT.includes("$297"), false);
    assert.equal(TERMS_TEXT.includes("DRAFT"), false);
    assert.equal(POLICIES.terms.draft, false);
    assert.equal(POLICIES.terms.version, "2026-08-06");
    for (const text of [REFUND_POLICY_TEXT, CANCELLATION_POLICY_TEXT, RECURRING_BILLING_TEXT]) {
      assert.match(text, /^DRAFT — pending legal review/);
      assert.match(text, /Version: 2026-11-19/);
    }
    assert.match(BILLING_SUMMARY, /\$0 due today/);
    assert.match(BILLING_SUMMARY, /30-day free trial/);
    assert.match(BILLING_SUMMARY, /\$297 per month/);
    assert.match(RECURRING_BILLING_TEXT, /\$297 per month/);
    assert.match(REFUND_POLICY_TEXT, /Cancel within 30 days and you pay nothing/);
    assert.match(CANCELLATION_POLICY_TEXT, /30 days written notice/);
  });
});

describe("Purchase context", () => {
  it("prefers CF-Connecting-IP and otherwise the first X-Forwarded-For hop", () => {
    assert.equal(
      clientIpFromHeaders(
        headers({
          "cf-connecting-ip": "198.51.100.10",
          "x-forwarded-for": "203.0.113.5, 10.0.0.1",
        }),
      ),
      "198.51.100.10",
    );
    assert.equal(
      clientIpFromHeaders(headers({ "x-forwarded-for": " 203.0.113.5 , 198.51.100.2 " })),
      "203.0.113.5",
    );
    assert.equal(
      clientIpFromHeaders(
        headers({ "cf-connecting-ip": "not-an-ip", "x-forwarded-for": "203.0.113.9" }),
      ),
      "203.0.113.9",
    );
    assert.equal(clientIpFromHeaders(headers({ "x-real-ip": "203.0.113.8" })), "");
    assert.equal(clientIpFromHeaders(headers({ "cf-connecting-ip": "203.0.113.5:443" })), "");
    assert.equal(
      clientIpFromHeaders(headers({ "cf-connecting-ip": "2001:db8::1" })),
      "2001:db8::1",
    );
    assert.equal(clientIpFromHeaders(headers({ "cf-connecting-ip": "999.1.1.1" })), "");
  });

  it("builds the Hub contract from the request and ignores a body IP", () => {
    const forged = headers({
      "x-forwarded-for": "203.0.113.5, 10.0.0.8",
      "user-agent": "Mozilla/5.0 Onboarding",
    });
    const context = buildPurchaseContext({ headers: forged, deviceId, at });
    assert.equal(context.ip, "203.0.113.5");
    assert.equal(context.userAgent, "Mozilla/5.0 Onboarding");
    assert.deepEqual(context.purchase, {
      ip: "203.0.113.5",
      userAgent: "Mozilla/5.0 Onboarding",
      deviceId,
    });
    for (const key of POLICY_KEYS) {
      const record = context.acceptance[key];
      const policy = POLICIES[key];
      assert.equal(record.accepted, true);
      assert.equal(record.version, policy.version);
      assert.equal(record.at, at);
      assert.equal(record.ip, "203.0.113.5");
      assert.equal(record.userAgent, "Mozilla/5.0 Onboarding");
      assert.equal(record.textHash, textHash(policy.text));
      assert.equal(record.textUrl, `https://clientonboarding.leadgenisys.com${policy.path}`);
    }
    assert.equal("ip" in context.acceptance.terms, true);
  });

  it("drops a short device id and cuts an oversized user agent", () => {
    const ua = "A".repeat(USER_AGENT_LIMIT + 50);
    const context = buildPurchaseContext({
      headers: headers({ "user-agent": ua, "cf-connecting-ip": "198.51.100.10" }),
      deviceId: "too-short",
      at,
    });
    assert.equal(context.userAgent.length, USER_AGENT_LIMIT);
    assert.equal("deviceId" in context.purchase, false);
    assert.equal(isDeviceId(deviceId), true);
    assert.equal(isDeviceId("short"), false);
  });

  it("requires every agreement to be the boolean true", () => {
    const yes = {
      terms: true,
      refundPolicy: true,
      cancellationPolicy: true,
      recurringBilling: true,
    };
    assert.equal(acceptanceFlagsSchema.safeParse(yes).success, true);
    assert.equal(acceptanceFlagsSchema.safeParse({ ...yes, terms: false }).success, false);
    assert.equal(acceptanceFlagsSchema.safeParse({ ...yes, terms: "true" }).success, false);
    assert.equal(acceptanceFlagsSchema.safeParse({ terms: true }).success, false);
    const stripped = acceptanceFlagsSchema.parse({ ...yes, ip: "203.0.113.5", textHash: "ab" });
    assert.equal("ip" in stripped, false);
    assert.equal("textHash" in stripped, false);
  });
});

describe("Intake webhook payload", () => {
  it("keeps the existing fields and adds the purchase contract beside them", () => {
    const purchaseContext = buildPurchaseContext({
      headers: headers({ "cf-connecting-ip": "198.51.100.10", "user-agent": "TestAgent" }),
      deviceId,
      at,
    });
    const payload = buildIntakeWebhookPayload(
      { fullName: "Maria Lopez" },
      ["https://files.example/logo.png"],
      at,
      purchaseContext,
    );
    assert.equal(payload.event, "intake.submitted");
    assert.equal(payload.submittedAt, at);
    assert.equal(payload.source, "client-onboarding-funnel");
    assert.equal(payload.answers["fullName"], "Maria Lopez");
    assert.deepEqual(payload.files, ["https://files.example/logo.png"]);
    assert.equal(payload.ip, "198.51.100.10");
    assert.equal(payload.userAgent, "TestAgent");
    assert.equal(payload.purchase?.deviceId, deviceId);
    assert.equal(payload.acceptance?.terms.accepted, true);
    assert.equal(payload.acceptance?.refundPolicy.textHash.length, 64);
    assert.equal(payload.acceptance?.cancellationPolicy.version, "2026-11-19");
    assert.equal(
      payload.acceptance?.recurringBilling.textUrl,
      "https://clientonboarding.leadgenisys.com/recurring-billing",
    );
  });

  it("leaves a caller without clickwrap data on the previous payload shape", () => {
    const payload = buildIntakeWebhookPayload({ fullName: "Maria Lopez" }, [], at);
    assert.equal(payload.ip, undefined);
    assert.equal(payload.acceptance, undefined);
    assert.equal(payload.answers["fullName"], "Maria Lopez");
  });
});
