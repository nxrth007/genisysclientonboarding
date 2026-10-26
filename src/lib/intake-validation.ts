import { z } from "zod";

import { hasAddressNumber, looksLikeAddress } from "./address-check";
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

const answersSchema = z.object(
  Object.fromEntries(
    INTAKE_FIELDS.map((field) => [
      field.id,
      field.requiredWhen || field.optional
        ? z.string().trim().max(field.type === "textarea" ? 5000 : 500)
        : fieldSchema(field),
    ]),
  ) as Record<string, z.ZodType<string>>,
);

export const intakeSchema = z
  .object({
    answers: answersSchema,
    filePaths: z.array(z.string().trim().min(1).max(500)).max(21),
  })
  .superRefine((data, ctx) => {
    for (const field of INTAKE_FIELDS) {
      if (!field.requiredWhen) continue;
      const trigger = data.answers[field.requiredWhen.field];
      const value = data.answers[field.id];
      if (trigger === field.requiredWhen.equals && !value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["answers", field.id],
          message: "This field is required",
        });
      }
    }
    // Name and address in the wrong boxes: clients have put their address
    // in "Legal Business Name" and their business name in "Business Address".
    const name = data.answers["businessName"] ?? "";
    if (looksLikeAddress(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers", "businessName"],
        message:
          "That looks like an address. Put your business's legal name here; your address goes in Business Address below.",
      });
    }
    const address = data.answers["businessAddress"] ?? "";
    if (address.trim() && !hasAddressNumber(address)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers", "businessAddress"],
        message:
          "Enter the street address with its number, e.g. 123 Main St, Austin, TX 78701. Start typing and pick it from the list.",
      });
    }
  });

export type IntakeInput = z.infer<typeof intakeSchema>;
