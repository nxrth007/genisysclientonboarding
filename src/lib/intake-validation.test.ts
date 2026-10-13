import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { INTAKE_FIELDS } from "./intake-fields";
import { intakeSchema } from "./intake-validation";

function inputWithProfile(answer: string) {
  const answers = Object.fromEntries(
    INTAKE_FIELDS.map((field) => [
      field.id,
      field.type === "radio" ? "No" : field.type === "email" ? "test@example.com" : "Test",
    ]),
  );
  answers.hasGoogleProfile = answer;
  return { answers, filePaths: [] };
}

describe("Google Business Profile answers", () => {
  it("accepts Yes and No", () => {
    for (const answer of ["Yes", "No"]) {
      assert.equal(intakeSchema.safeParse(inputWithProfile(answer)).success, true);
    }
  });

  it("rejects Not sure", () => {
    const result = intakeSchema.safeParse(inputWithProfile("Not sure"));
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[1] === "hasGoogleProfile"));
    }
  });
});