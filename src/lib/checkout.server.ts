import { checkoutSessionSchema, parseVerifiedCheckout, assertCheckoutOwner } from "./checkout-validation";

const VERIFY_URL = "https://qlviirvjbiopltrqucej.supabase.co/functions/v1/verify-checkout-session";

export async function verifyCheckout(sessionId: string, fetcher: typeof fetch = fetch) {
  const id = checkoutSessionSchema.parse(sessionId);
  // Read only during server execution; never return or log credentials/provider errors.
  const key = process.env["ONBOARDING_VERIFICATION_KEY"];
  if (!key) throw new Error("Checkout confirmation is temporarily unavailable. Please contact the Lead Genisys team; you don't need to purchase again.");
  try {
    const response = await fetcher(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-onboarding-key": key },
      body: JSON.stringify({ session_id: id }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Verification failed");
    return parseVerifiedCheckout(await response.json());
  } catch {
    throw new Error("We couldn't confirm this checkout. Please contact the Lead Genisys team; you don't need to purchase again.");
  }
}

export async function verifyOwnedCheckout(sessionId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Please confirm your checkout email to continue.");
  const checkout = await verifyCheckout(sessionId);
  assertCheckoutOwner(checkout.email, data.user.email, data.user.email_confirmed_at);
  return checkout;
}

export async function assertUnusedCheckout(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("checkout_onboarding_submissions").select("session_id").eq("session_id", sessionId).maybeSingle();
  if (error) throw new Error("We couldn't check your onboarding. Please try again later.");
  if (data) throw new Error("This trial's onboarding has already been received. Please contact the Lead Genisys team if you need help.");
}