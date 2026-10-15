import { createServerFn } from "@tanstack/react-start";

import { intakeSchema } from "./intake-validation";
import { recordIntakeSubmission } from "./intake.server";

export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = intakeSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        "We couldn't submit the form — please double-check your answers and attached files, then try again.",
      );
    }
    return parsed.data;
  })
  .handler(async ({ data }) => recordIntakeSubmission(data));