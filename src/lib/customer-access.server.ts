import { assertCheckoutOwner } from "./checkout-validation";
import { verifyCheckout } from "./checkout.server";
import { matchesCustomerRecords, normalizeCustomerEmail, assertCustomerSubmissionAvailable } from "./customer-validation";

export async function authorizeCustomer(userId: string, sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  const user = data.user;
  if (error || !user?.email || !user.email_confirmed_at) throw new Error("Please confirm your account email before submitting.");
  const email = normalizeCustomerEmail(user.email);
  if (sessionId) {
    const checkout = await verifyCheckout(sessionId);
    assertCheckoutOwner(checkout.email, user.email, user.email_confirmed_at);
    return { email: normalizeCustomerEmail(checkout.email) };
  }
  // Existing customers are matched only after proof of mailbox ownership.
  const { data: previous, error: ledgerError } = await supabaseAdmin.from("checkout_onboarding_submissions")
    .select("session_id").eq("customer_email", email).limit(1);
  if (ledgerError) throw new Error("We couldn't check your account. Please contact the Lead Genisys team.");
  if (previous?.length) return { email };
  const key = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!key || !connectionKey) throw new Error("We couldn't check your account. Please contact the Lead Genisys team.");
  const response = await fetch("https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/1-xDJVi6HpntUJUWrZWi6rPTmDamyHytKi_aLttL-UU4/values/Sheet1!C2:C", {
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connectionKey },
    signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Customer tracker lookup failed [${response.status}]: ${await response.text()}`);
    throw new Error("We couldn't check your account. Please contact the Lead Genisys team.");
  }
  const result = await response.json() as { values?: string[][] };
  if (!matchesCustomerRecords(email, result.values ?? [])) throw new Error("We couldn't match your confirmed email to a customer account. Contact the Lead Genisys team — you don't need to purchase again.");
  return { email };
}

export async function assertCustomerUnused(email: string, sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("checkout_onboarding_submissions")
    .select("session_id").eq("customer_email", normalizeCustomerEmail(email)).limit(1);
  if (error) throw new Error("We couldn't check your onboarding. Please contact the Lead Genisys team.");
  assertCustomerSubmissionAvailable(Boolean(data?.length));
  if (sessionId) {
    const { data: session, error: sessionError } = await supabaseAdmin.from("checkout_onboarding_submissions").select("session_id").eq("session_id", sessionId).maybeSingle();
    if (sessionError) throw new Error("We couldn't check your onboarding. Please contact the Lead Genisys team.");
    assertCustomerSubmissionAvailable(Boolean(session));
  }
}