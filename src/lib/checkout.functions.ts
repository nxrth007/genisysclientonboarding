import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSessionSchema, NOT_CONFIRMED } from "./checkout-validation";
import { configuredVerifiers, signInTokenFor, verifyCheckout, verifyEmail, verifyOwnedCheckout, assertUnusedCheckout } from "./checkout.server";
import { assertCustomerUnused } from "./customer-access.server";

const claimInput = z.union([
  z.object({ sessionId: checkoutSessionSchema }),
  z.object({ email: z.string().trim().toLowerCase().email().max(254) }),
]);

export const NO_TRIAL_FOR_EMAIL = "We couldn't find a free trial under that email. Use the email from your sign-up, or contact the Lead Genisys team.";

/**
 * The client's way in, with no email to open: the checkout id from their
 * sign-up link, or the email they signed up with. Either is checked against
 * Stripe (a completed trial checkout, or a trialing/active subscription); if
 * it holds and their onboarding hasn't been received already, they get a
 * one-time sign-in token. The answer carries the verified email (theirs) and
 * the verifiers' names and statuses for the team; never a key or Stripe detail.
 */
export const claimAccess = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => claimInput.parse(data))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const via = configuredVerifiers();
    const trail: string[] = [];
    const byEmail = "email" in data;
    try {
      const verified = byEmail ? await verifyEmail(data.email, fetch, trail) : await verifyCheckout(data.sessionId, fetch, trail);
      const email = verified.email.trim().toLowerCase();
      if (byEmail && email !== data.email) throw new Error(NOT_CONFIRMED);
      await assertCustomerUnused(email, byEmail ? "" : data.sessionId);
      const tokenHash = await signInTokenFor(email);
      return { ok: true as const, email, tokenHash, via, trail };
    } catch (error) {
      const raw = error instanceof Error ? error.message : NOT_CONFIRMED;
      const message = byEmail && raw === NOT_CONFIRMED ? NO_TRIAL_FOR_EMAIL : raw;
      return { ok: false as const, message, via, trail };
    }
  });

export const authorizeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const checkout = await verifyOwnedCheckout(data, context.userId);
    await assertUnusedCheckout(data);
    return { email: checkout.email.trim().toLowerCase() };
  });