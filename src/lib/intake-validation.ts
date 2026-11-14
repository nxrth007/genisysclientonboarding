import { z } from "zod";

import { checkAnswer, normalizeAnswer } from "./answer-checks";
import { INTAKE_FIELDS } from "./intake-fields";

/**
 * The intake answers, held to the same rules on the page and on the server.
 * Each answer is tidied first (one phone format, "City ST" lists, https://
 * websites), then checked against what its question needs. The rules and
 * their plain-English messages live in answer-checks.ts; only its errors
 * block a submission (its warnings are for the page).
 */

const answersSchema = z.object(
  Object.fromEntries(
    INTAKE_FIELDS.map((field) => {
      const limit = field.type === "textarea" ? 5000 : 500;
      return [
        field.id,
        z
          .string()
          .max(limit, `That's too long. Please keep it under ${limit} characters.`)
          .transform((value) => normalizeAnswer(field.id, value)),
      ];
    }),
  ) as Record<string, z.ZodType<string, z.ZodTypeDef, string>>,
);

export const intakeSchema = z
  .object({
    answers: answersSchema,
    filePaths: z.array(z.string().trim().min(1).max(500)).max(21),
  })
  .superRefine((data, ctx) => {
    for (const field of INTAKE_FIELDS) {
      const { error } = checkAnswer(field, data.answers);
      if (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers", field.id],
          message: error,
        });
      }
    }
  });

export type IntakeInput = z.infer<typeof intakeSchema>;
