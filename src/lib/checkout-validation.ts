import { z } from "zod";

export const checkoutSessionSchema = z.string().regex(/^cs_test_[A-Za-z0-9]+$/).max(300);

const verificationSchema = z.object({
  valid: z.literal(true),
  email: z.string().email(),
  livemode: z.literal(false),
  subscription_status: z.enum(["trialing", "active"]),
});

export function parseVerifiedCheckout(value: unknown) {
  const parsed = verificationSchema.safeParse(value);
  if (!parsed.success) throw new Error("We couldn't confirm your trial. Please return to the trial page.");
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