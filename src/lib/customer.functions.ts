import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { authorizeCustomer, assertCustomerUnused } from "./customer-access.server";
import { checkoutSessionSchema } from "./checkout-validation";

export const optionalCheckoutSessionSchema = z.union([z.literal(""), checkoutSessionSchema]);
const draftAnswers = z.record(z.string().max(5000)).refine((value) => Object.keys(value).length <= 40);

export const getCustomerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => optionalCheckoutSessionSchema.parse(data))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const customer = await authorizeCustomer(context.userId, data);
    await assertCustomerUnused(customer.email, data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: draft, error } = await supabaseAdmin.from("onboarding_drafts").select("answers,session_id")
      .eq("user_id", context.userId).eq("verified_email", customer.email).maybeSingle();
    if (error) throw new Error("We couldn't restore your saved answers. Please try again.");
    return { email: customer.email, draft: draft?.answers ?? null };
  });

export const saveCustomerDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sessionId: optionalCheckoutSessionSchema, answers: draftAnswers }).parse(data))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "no-store");
    const customer = await authorizeCustomer(context.userId, data.sessionId);
    await assertCustomerUnused(customer.email, data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("onboarding_drafts").upsert({ user_id: context.userId, verified_email: customer.email, answers: data.answers, session_id: data.sessionId || null, updated_at: new Date().toISOString() });
    if (error) throw new Error("We couldn't save your progress. Please try again.");
    return { ok: true };
  });