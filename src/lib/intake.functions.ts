import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { intakeSchema } from "./intake-validation";
import { checkoutSessionSchema } from "./checkout-validation";
import { submitCheckoutIntake } from "./checkout-submission.server";

export const submitIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = intakeSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        "We couldn't submit the form — please double-check your answers and attached files, then try again.",
      );
    }
    const raw = data as Record<string, unknown>;
    const sessionId = checkoutSessionSchema.safeParse(raw["sessionId"]);
    if (!sessionId.success) throw new Error("Please return to the trial page to confirm your checkout.");
    return { ...parsed.data, sessionId: sessionId.data };
  })
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    return submitCheckoutIntake(data, context.userId);
  });