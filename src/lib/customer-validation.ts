export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export function matchesCustomerRecords(email: string, rows: string[][]) {
  const normalized = normalizeCustomerEmail(email);
  return rows.some((row) => typeof row[0] === "string" && normalizeCustomerEmail(row[0]) === normalized);
}

export function assertCustomerSubmissionAvailable(existing: boolean) {
  if (existing) throw new Error("Your onboarding has already been received. Contact the Lead Genisys team if you need to update it.");
}