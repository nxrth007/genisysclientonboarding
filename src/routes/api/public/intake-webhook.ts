import { createFileRoute } from "@tanstack/react-router";

import { intakeSchema } from "@/lib/intake-validation";
import { recordIntakeSubmission } from "@/lib/intake.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Secret",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const Route = createFileRoute("/api/public/intake-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        // Verify the caller with a shared secret.
        const secret = process.env["INTAKE_WEBHOOK_SECRET"];
        const provided = request.headers.get("x-webhook-secret") ?? "";
        if (!secret || !timingSafeEqual(provided, secret)) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }

        // Parse and validate the body.
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, error: "Body must be valid JSON" }, 400);
        }

        // Accept either { answers: {...}, filePaths: [...] } or a flat
        // { fieldId: "value", ... } object.
        const raw = body as Record<string, unknown>;
        const candidate =
          raw && typeof raw === "object" && raw.answers && typeof raw.answers === "object"
            ? raw
            : { answers: raw, filePaths: [] };

        const parsed = intakeSchema.safeParse(candidate);
        if (!parsed.success) {
          return json(
            {
              ok: false,
              error: "Invalid payload",
              details: parsed.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
              })),
            },
            422,
          );
        }

        try {
          const result = await recordIntakeSubmission(parsed.data);
          return json({ ok: true, payload: result.payload });
        } catch (error) {
          console.error("Intake webhook processing failed", error);
          return json({ ok: false, error: "Failed to record submission" }, 500);
        }
      },
    },
  },
});
