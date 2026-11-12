import { bindCheckoutEmail } from "./checkout-validation";
import { verifyOwnedCheckout } from "./checkout.server";
import { recordIntakeSubmission } from "./intake.server";
import type { IntakeInput } from "./intake-validation";

export async function submitCheckoutIntake(input: IntakeInput & { sessionId: string }, userId: string) {
  // Re-read Stripe and confirmed identity on every submission, before any side effects.
  const checkout = await verifyOwnedCheckout(input.sessionId, userId);
  const answers = bindCheckoutEmail(input.answers, checkout.email);
  if (input.filePaths.some((path) => !path.startsWith(`${userId}/${input.sessionId}/`) || path.includes(".."))) {
    throw new Error("Please reattach your files and try again.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("checkout_onboarding_submissions").insert({
    session_id: input.sessionId,
    user_id: userId,
    verified_email: answers.leadEmail,
    answers: input.answers,
    file_paths: input.filePaths,
  });
  if (error?.code === "23505") throw new Error("This trial's onboarding has already been received. Please contact the Lead Genisys team if you need help.");
  if (error) throw new Error("We couldn't save your onboarding. Please try again later.");
  try {
    await recordIntakeSubmission({ answers, filePaths: input.filePaths });
    const { error: updateError } = await supabaseAdmin.from("checkout_onboarding_submissions")
      .update({ status: "complete", completed_at: new Date().toISOString() }).eq("session_id", input.sessionId);
    if (updateError) console.error("Could not mark checkout onboarding complete");
    // No private answers, file URLs or Slack details in the browser response.
    return { ok: true as const };
  } catch {
    await supabaseAdmin.from("checkout_onboarding_submissions").update({ status: "needs_attention" }).eq("session_id", input.sessionId);
    throw new Error("Your details are saved, but our team needs to finish processing them. Please contact Lead Genisys; don't submit again.");
  }
}