import { FILE_FIELD_LABEL, INTAKE_FIELDS } from "./intake-fields";

export type IntakeWebhookPayload = {
  event: "intake.submitted";
  submittedAt: string;
  source: string;
  answers: Record<string, string>;
  labels: Record<string, string>;
  files: string[];
};

export function buildIntakeWebhookPayload(
  answers: Record<string, string>,
  fileUrls: string[],
  submittedAt: string,
): IntakeWebhookPayload {
  const labels: Record<string, string> = {};
  for (const field of INTAKE_FIELDS) {
    labels[field.label] = answers[field.id] ?? "";
  }
  labels[FILE_FIELD_LABEL] = fileUrls.join("\n");

  return {
    event: "intake.submitted",
    submittedAt,
    source: "client-onboarding-funnel",
    answers: Object.fromEntries(
      INTAKE_FIELDS.map((field) => [field.id, answers[field.id] ?? ""]),
    ),
    labels,
    files: fileUrls,
  };
}

/**
 * Fire-and-forget POST of the submission to every configured webhook URL.
 * Never throws: a failing webhook must not break the client's submission.
 */
export async function sendIntakeWebhooks(payload: IntakeWebhookPayload) {
  const raw = process.env["INTAKE_WEBHOOK_URL"] ?? "";
  const urls = raw
    .split(",")
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u));
  if (urls.length === 0) return;

  const secret = process.env["INTAKE_WEBHOOK_SECRET"];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["X-Webhook-Secret"] = secret;

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error(`Intake webhook to ${url} failed [${res.status}]`);
        }
      } catch (error) {
        console.error(`Intake webhook to ${url} errored`, error);
      }
    }),
  );
}
