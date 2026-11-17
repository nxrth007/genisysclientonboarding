import { z } from "zod";

/**
 * Stripe Checkout Session ids, test and live. The signup at leadgenisys.com
 * went live on 2026-11-16, so real clients arrive with cs_live_ ids; test ids
 * still work for rehearsals.
 */
export const checkoutSessionSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/).max(300);

/** What a verifier (the Hub, or the signup site's own function) says about a confirmed sign-up. */
const verificationSchema = z.object({
  valid: z.literal(true),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  livemode: z.boolean().optional(),
  subscription_status: z.enum(["trialing", "active"]),
  trial_end: z.string().nullable().optional(),
});
export type VerifiedCheckout = z.infer<typeof verificationSchema>;

export const NOT_CONFIRMED = "We couldn't confirm this checkout. Please contact the Lead Genisys team; you don't need to purchase again.";

export function parseVerifiedCheckout(value: unknown): VerifiedCheckout {
  const parsed = verificationSchema.safeParse(value);
  if (!parsed.success) throw new Error(NOT_CONFIRMED);
  return parsed.data;
}

export function assertCheckoutOwner(checkoutEmail: string, confirmedEmail: string | undefined, confirmedAt: string | undefined) {
  if (!confirmedAt || !confirmedEmail || checkoutEmail.trim().toLowerCase() !== confirmedEmail.trim().toLowerCase()) {
    throw new Error("Please confirm the same email address you used at checkout.");
  }
}

export function bindCheckoutEmail(answers: Record<string, string>, email: string) {
  return { ...answers, leadEmail: email.trim().toLowerCase() };
}
