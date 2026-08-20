import { z } from "zod";

import { INTAKE_FIELDS } from "./intake-fields";

export const intakeSchema = z.object({
  answers: z.object(
    Object.fromEntries(
      INTAKE_FIELDS.map((field) => [
        field.id,
        field.type === "email"
          ? z.string().trim().email("Enter a valid email address").max(320)
          : z
              .string()
              .trim()
              .min(1, "This field is required")
              .max(field.type === "textarea" ? 5000 : 500),
      ]),
    ) as Record<string, z.ZodString>,
  ),
  filePaths: z.array(z.string().trim().min(1).max(500)).max(20),
});

export type IntakeInput = z.infer<typeof intakeSchema>;