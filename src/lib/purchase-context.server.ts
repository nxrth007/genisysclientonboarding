import { isDeviceId } from "./device-id";

/** Real browser user agents fit. A longer header is cut so a forged header cannot bloat the record. */
export const USER_AGENT_LIMIT = 2000;

export type PurchaseRecord = {
  ip: string;
  userAgent: string;
  deviceId?: string;
};

/**
 * Server-captured request context for the Hub webhook.
 * There is no acceptance record: the form does not show or collect consent.
 */
export type IntakePurchaseContext = {
  ip: string;
  userAgent: string;
  purchase: PurchaseRecord;
};

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

/** Builds the Hub purchase context from the request. Consent is not part of it. */
export function buildPurchaseContext(input: {
  headers: Headers;
  deviceId: unknown;
}): IntakePurchaseContext {
  const ip = clientIpFromHeaders(input.headers);
  const userAgent = userAgentFromHeaders(input.headers);
  const deviceId = parseDeviceId(input.deviceId);
  const purchase: PurchaseRecord = deviceId ? { ip, userAgent, deviceId } : { ip, userAgent };
  return { ip, userAgent, purchase };
}
