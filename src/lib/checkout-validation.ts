import { z } from "zod";

export const checkoutSessionSchema = z.string().regex(/^cs_test_[A-Za-z0-9]+$/).max(300);

const verificationSchema = z.object({
  valid: z.literal(true),
  email: z.string().email(),
  // The secured endpoint omits livemode; callers already require cs_test_ IDs.
  // If a provider supplies livemode, explicitly reject true.
  livemode: z.literal(false).optional(),
  subscription_status: z.enum(["trialing", "active"]),
});

export function parseVerifiedCheckout(value: unknown) {
  const parsed = verificationSchema.safeParse(value);
  if (!parsed.success) throw new Error("We couldn't confirm this checkout. Please contact the Lead Genisys team; you don't need to purchase again.");
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