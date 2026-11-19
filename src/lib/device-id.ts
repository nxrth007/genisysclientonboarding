/** A stable random id for this browser. Optional on the purchase record. Not an answer draft. */
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{15,128}$/;
const STORAGE_KEY = "lead-genisys-device-id";

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

/** Reads the saved id, or creates one. Returns "" when storage is unavailable. */
export function ensureDeviceId(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (isDeviceId(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return isDeviceId(id) ? id : "";
  } catch {
    return "";
  }
}
