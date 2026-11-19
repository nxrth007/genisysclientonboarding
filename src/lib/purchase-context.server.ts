import { createHash } from "node:crypto";

import { z } from "zod";

import { isDeviceId } from "./device-id";
import { POLICIES, POLICY_KEYS, policyUrl, type PolicyKey } from "./policies";

/** Real browser user agents fit. A longer header is cut so a forged header cannot bloat the record. */
export const USER_AGENT_LIMIT = 2000;

export const acceptanceFlagsSchema = z
  .object({
    terms: z.literal(true),
    refundPolicy: z.literal(true),
    cancellationPolicy: z.literal(true),
    recurringBilling: z.literal(true),
  })
  .strip();

export type AcceptanceFlags = z.infer<typeof acceptanceFlagsSchema>;

export type AcceptanceRecord = {
  accepted: true;
  version: string;
  at: string;
  ip: string;
  userAgent: string;
  textHash: string;
  textUrl: string;
};

export type PurchaseRecord = {
  ip: string;
  userAgent: string;
  deviceId?: string;
};

export type IntakePurchaseContext = {
  ip: string;
  userAgent: string;
  purchase: PurchaseRecord;
  acceptance: Record<PolicyKey, AcceptanceRecord>;
};

/** Lowercase hex SHA-256 of the exact policy text shown on the page. */
export function textHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpv6(value: string): boolean {
  if (value.length > 45 || !value.includes(":")) return false;
  return /^[0-9a-f:]+$/i.test(value);
}

/** One IP address. Lists, hostnames, and ports are not an address. */
export function isSingleIp(value: string): boolean {
  return isIpv4(value) || isIpv6(value);
}

/**
 * The client address from the edge, never from the JSON body.
 * Cloudflare's CF-Connecting-IP wins. Otherwise the first X-Forwarded-For hop.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const cloudflare = headers.get("cf-connecting-ip")?.trim() ?? "";
  if (isSingleIp(cloudflare)) return cloudflare;
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim() ?? "";
  if (isSingleIp(first)) return first;
  return "";
}

export function userAgentFromHeaders(headers: Headers): string {
  return (headers.get("user-agent") ?? "").slice(0, USER_AGENT_LIMIT);
}

export function parseDeviceId(value: unknown): string | undefined {
  return isDeviceId(value) ? value : undefined;
}

/** Builds the Hub contract from the request. Caller has already required every checkbox. */
export function buildPurchaseContext(input: {
  headers: Headers;
  deviceId: unknown;
  at: string;
}): IntakePurchaseContext {
  const ip = clientIpFromHeaders(input.headers);
  const userAgent = userAgentFromHeaders(input.headers);
  const deviceId = parseDeviceId(input.deviceId);
  const purchase: PurchaseRecord = deviceId ? { ip, userAgent, deviceId } : { ip, userAgent };
  const acceptance = Object.fromEntries(
    POLICY_KEYS.map((key) => {
      const policy = POLICIES[key];
      const record: AcceptanceRecord = {
        accepted: true,
        version: policy.version,
        at: input.at,
        ip,
        userAgent,
        textHash: textHash(policy.text),
        textUrl: policyUrl(policy),
      };
      return [key, record];
    }),
  ) as Record<PolicyKey, AcceptanceRecord>;
  return { ip, userAgent, purchase, acceptance };
}
