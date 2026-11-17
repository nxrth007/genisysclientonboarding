import { checkoutSessionSchema, NOT_CONFIRMED, parseVerifiedCheckout, assertCheckoutOwner, type VerifiedCheckout } from "./checkout-validation";

/**
 * Who confirms that a sign-up is real (a completed Stripe checkout with a
 * trialing or active subscription), asked in this order:
 *
 *  1. The Hub (genisys-hub.onrender.com, /api/public/checkout-verify): its Vault
 *     holds a restricted Stripe key, and the same password as HUB_VERIFICATION_KEY
 *     here. It can also answer for an email alone, for a client who lost the link.
 *  2. The signup site's own verify-checkout-session function (ONBOARDING_VERIFICATION_KEY),
 *     for checkout ids only.
 *
 * A verifier that is unreachable, broken or not set up here is skipped for the
 * next, so onboarding keeps working while either is down. A verifier that
 * answers "no" is believed only when no other verifier says "yes".
 */
const HUB_URL = (process.env["HUB_URL"] || "https://genisys-hub.onrender.com").replace(/\/+$/, "");
const SIGNUP_VERIFY_URL = "https://qlviirvjbiopltrqucej.supabase.co/functions/v1/verify-checkout-session";

export const UNAVAILABLE = "Checkout confirmation is temporarily unavailable. Please contact the Lead Genisys team; you don't need to purchase again.";

type Question = { sessionId: string } | { email: string };
type Verifier = { name: string; url: string; keyEnv: string };

function verifiersFor(q: Question): Verifier[] {
  const list: Verifier[] = [{ name: "hub", url: `${HUB_URL}/api/public/checkout-verify`, keyEnv: "HUB_VERIFICATION_KEY" }];
  if ("sessionId" in q) list.push({ name: "signup", url: SIGNUP_VERIFY_URL, keyEnv: "ONBOARDING_VERIFICATION_KEY" });
  return list;
}

async function ask(q: Question, fetcher: typeof fetch): Promise<VerifiedCheckout> {
  let answered = false;
  for (const v of verifiersFor(q)) {
    // Read only during server execution; never returned or logged.
    const key = process.env[v.keyEnv];
    if (!key) continue;
    let response: Response;
    try {
      response = await fetcher(v.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-onboarding-key": key },
        body: JSON.stringify("sessionId" in q ? { session_id: q.sessionId } : { email: q.email }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      continue; // unreachable: the next verifier may answer
    }
    if (response.ok) {
      try {
        return parseVerifiedCheckout(await response.json());
      } catch {
        continue; // an answer in a shape we don't trust counts as no answer
      }
    }
    // 403 (not a member) and 404 are answers; a wrong password (401), a bad request or a server error are not.
    if (response.status === 403 || response.status === 404) answered = true;
  }
  throw new Error(answered ? NOT_CONFIRMED : UNAVAILABLE);
}

/** Confirms a checkout id from the sign-up link. */
export async function verifyCheckout(sessionId: string, fetcher: typeof fetch = fetch): Promise<VerifiedCheckout> {
  const id = checkoutSessionSchema.parse(sessionId);
  return ask({ sessionId: id }, fetcher);
}

/** Confirms a client by the email they proved they own (no link): the Hub asks Stripe for a trialing or active subscription. */
export async function verifyEmail(email: string, fetcher: typeof fetch = fetch): Promise<VerifiedCheckout> {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error(NOT_CONFIRMED);
  return ask({ email: clean }, fetcher);
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
