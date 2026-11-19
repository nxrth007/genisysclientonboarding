import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { INTAKE_FIELDS } from "./intake-fields";
import { intakeSchema } from "./intake-validation";
import { optionalCheckoutSessionSchema } from "./customer.functions";
import { submitCheckoutIntake } from "./checkout-submission.server";
import { acceptanceFlagsSchema, buildPurchaseContext, parseDeviceId } from "./purchase-context.server";

export const submitIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = intakeSchema.safeParse(data);
    if (!parsed.success) {
      // Name the answer to fix, as the page does.
      const issue = parsed.error.issues.find((i) => i.path[0] === "answers") ?? parsed.error.issues[0];
      const field = INTAKE_FIELDS.find((f) => f.id === issue?.path[1]);
      throw new Error(
        field && issue
          ? `Please check "${field.short ?? field.label}": ${issue.message}`
          : "We couldn't submit the form — please double-check your answers and attached files, then try again.",
      );
    }
    const raw = data as Record<string, unknown>;
    const sessionId = optionalCheckoutSessionSchema.safeParse(raw["sessionId"] ?? "");
    if (!sessionId.success) throw new Error("We couldn't confirm this checkout link. Please contact the Lead Genisys team.");
    // Checkboxes only. IP, user agent, hashes, and timestamps are filled on the server.
    const acceptance = acceptanceFlagsSchema.safeParse(raw["acceptance"]);
    if (!acceptance.success) {
      throw new Error(
        "Please accept the Terms of Service, Refund Policy, Cancellation Policy, and recurring billing terms before submitting.",
      );
    }
    const deviceId = parseDeviceId(raw["deviceId"]);
    return { ...parsed.data, sessionId: sessionId.data, acceptance: acceptance.data, ...(deviceId ? { deviceId } : {}) };
  })
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const request = getRequest();
    const purchaseContext = buildPurchaseContext({
      headers: request?.headers ?? new Headers(),
      deviceId: data.deviceId,
      at: new Date().toISOString(),
    });
    return submitCheckoutIntake({ ...data, purchaseContext }, context.userId);
  });