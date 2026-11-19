import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isDeviceId } from "./device-id";
import { buildIntakeWebhookPayload, webhookBody } from "./intake-webhook.server";
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
  buildPurchaseContext,
  clientIpFromHeaders,
  USER_AGENT_LIMIT,
} from "./purchase-context.server";

const deviceId = "11111111-2222-4333-8444-555555555555";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("Policy text", () => {
  it("keeps each policy page's text stable", () => {
    for (const key of POLICY_KEYS) {
      const policy = POLICIES[key];
      const expected = createHash("sha256").update(policy.text, "utf8").digest("hex");
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

  it("builds purchase context from the request and ignores a body IP", () => {
    const forged = headers({
      "x-forwarded-for": "203.0.113.5, 10.0.0.8",
      "user-agent": "Mozilla/5.0 Onboarding",
    });
    const context = buildPurchaseContext({ headers: forged, deviceId });
    assert.equal(context.ip, "203.0.113.5");
    assert.equal(context.userAgent, "Mozilla/5.0 Onboarding");
    assert.deepEqual(context.purchase, {
      ip: "203.0.113.5",
      userAgent: "Mozilla/5.0 Onboarding",
      deviceId,
    });
    assert.equal("acceptance" in context, false);
  });

  it("drops a short device id and cuts an oversized user agent", () => {
    const ua = "A".repeat(USER_AGENT_LIMIT + 50);
    const context = buildPurchaseContext({
      headers: headers({ "user-agent": ua, "cf-connecting-ip": "198.51.100.10" }),
      deviceId: "too-short",
    });
    assert.equal(context.userAgent.length, USER_AGENT_LIMIT);
    assert.equal("deviceId" in context.purchase, false);
    assert.equal(isDeviceId(deviceId), true);
    assert.equal(isDeviceId("short"), false);
  });
});

describe("Intake webhook payload", () => {
  it("keeps the existing fields and adds purchase context without acceptance", () => {
    const purchaseContext = buildPurchaseContext({
      headers: headers({ "cf-connecting-ip": "198.51.100.10", "user-agent": "TestAgent" }),
      deviceId,
    });
    const payload = buildIntakeWebhookPayload(
      { fullName: "Maria Lopez" },
      ["https://files.example/logo.png"],
      "2026-11-19T19:00:00.000Z",
      purchaseContext,
    );
    assert.equal(payload.event, "intake.submitted");
    assert.equal(payload.submittedAt, "2026-11-19T19:00:00.000Z");
    assert.equal(payload.source, "client-onboarding-funnel");
    assert.equal(payload.answers["fullName"], "Maria Lopez");
    assert.deepEqual(payload.files, ["https://files.example/logo.png"]);
    assert.equal(payload.ip, "198.51.100.10");
    assert.equal(payload.userAgent, "TestAgent");
    assert.equal(payload.purchase?.ip, "198.51.100.10");
    assert.equal(payload.purchase?.userAgent, "TestAgent");
    assert.equal(payload.purchase?.deviceId, deviceId);
    assert.equal("acceptance" in payload, false);
    const wire = webhookBody({
      ...payload,
      acceptance: { terms: { accepted: true } },
    } as typeof payload & { acceptance: unknown });
    assert.equal(wire.includes("acceptance"), false);
    assert.equal(wire.includes("198.51.100.10"), true);
    assert.equal(wire.includes(deviceId), true);
  });

  it("leaves a caller without purchase context on the previous payload shape", () => {
    const payload = buildIntakeWebhookPayload(
      { fullName: "Maria Lopez" },
      [],
      "2026-11-19T19:00:00.000Z",
    );
    assert.equal(payload.ip, undefined);
    assert.equal(payload.userAgent, undefined);
    assert.equal(payload.purchase, undefined);
    assert.equal("acceptance" in payload, false);
    assert.equal(payload.answers["fullName"], "Maria Lopez");
    assert.equal(webhookBody(payload).includes("acceptance"), false);
  });
});
