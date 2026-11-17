import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSessionSchema } from "./checkout-validation";
import { configuredVerifiers, verifyCheckout, verifyOwnedCheckout, assertUnusedCheckout } from "./checkout.server";

// The public probe reveals eligibility only, never Stripe customer information.
export const checkCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => typeof data === "string" ? data.slice(0, 301) : "")
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const via = configuredVerifiers();
    const trail: string[] = [];
    if (!checkoutSessionSchema.safeParse(data).success) return { valid: false, via, trail };
    try {
      await verifyCheckout(data, fetch, trail);
      return { valid: true, via, trail };
    } catch {
      return { valid: false, via, trail };
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