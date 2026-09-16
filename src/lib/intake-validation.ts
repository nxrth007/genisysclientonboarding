import { z } from "zod";

import { INTAKE_FIELDS } from "./intake-fields";

function fieldSchema(field: (typeof INTAKE_FIELDS)[number]) {
  if (field.type === "radio") {
    const options = field.options ?? [];
    return z
      .string()
      .trim()
      .refine((value) => options.includes(value), "Please choose an option");
  }
  if (field.type === "email") {
    return z.string().trim().email("Enter a valid email address").max(320);
  }
  return z
    .string()
    .trim()
    .min(1, "This field is required")
    .max(field.type === "textarea" ? 5000 : 500);
}

export const intakeSchema = z.object({
  answers: z.object(
    Object.fromEntries(
      INTAKE_FIELDS.map((field) => [field.id, fieldSchema(field)]),
    ) as Record<string, z.ZodType<string>>,
  ),
  filePaths: z.array(z.string().trim().min(1).max(500)).max(20),
});

export type IntakeInput = z.infer<typeof intakeSchema>;
