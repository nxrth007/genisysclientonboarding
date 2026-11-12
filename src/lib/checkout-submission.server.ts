import { bindCheckoutEmail } from "./checkout-validation";
import { authorizeCustomer } from "./customer-access.server";
import { recordIntakeSubmission } from "./intake.server";
import type { IntakeInput } from "./intake-validation";

export async function submitCheckoutIntake(input: IntakeInput & { sessionId: string }, userId: string) {
  // Re-read Stripe and confirmed identity on every submission, before any side effects.
  const checkout = await authorizeCustomer(userId, input.sessionId);
  const answers = bindCheckoutEmail(input.answers, checkout.email);
  if (input.filePaths.some((path) => !path.startsWith(`${userId}/${input.sessionId || "returning"}/`) || path.includes(".."))) {
    throw new Error("Please reattach your files and try again.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("checkout_onboarding_submissions").insert({
    session_id: input.sessionId || `returning:${checkout.email}`,
    user_id: userId,
    verified_email: answers.leadEmail,
    answers: input.answers,
    file_paths: input.filePaths,
  });
  if (error?.code === "23505") throw new Error("Your onboarding has already been received. Contact the Lead Genisys team if you need to update it.");
  if (error) throw new Error("We couldn't save your onboarding. Please try again later.");
  try {
    await recordIntakeSubmission({ answers, filePaths: input.filePaths });
    const { error: updateError } = await supabaseAdmin.from("checkout_onboarding_submissions")
      .update({ status: "complete", completed_at: new Date().toISOString() }).eq("customer_email", checkout.email);
    if (updateError) console.error("Could not mark checkout onboarding complete");
    await supabaseAdmin.from("onboarding_drafts").delete().eq("user_id", userId);
    // No private answers, file URLs or Slack details in the browser response.
    return { ok: true as const };
  } catch {
    await supabaseAdmin.from("checkout_onboarding_submissions").update({ status: "needs_attention" }).eq("customer_email", checkout.email);
    throw new Error("Your details are saved, but our team needs to finish processing them. Please contact Lead Genisys; don't submit again.");
  }
}