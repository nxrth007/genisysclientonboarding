import { createServerFn } from "@tanstack/react-start";

import { intakeSchema } from "./intake-validation";
import { recordIntakeSubmission } from "./intake.server";

export const submitIntake = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => intakeSchema.parse(data))
  .handler(async ({ data }) => recordIntakeSubmission(data));