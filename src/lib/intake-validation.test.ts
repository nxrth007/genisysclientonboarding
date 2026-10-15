import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { INTAKE_FIELDS } from "./intake-fields";
import { intakeSchema } from "./intake-validation";

function baseAnswers() {
  return Object.fromEntries(
    INTAKE_FIELDS.map((field) => [
      field.id,
      field.type === "radio" ? "No" : field.type === "email" ? "test@example.com" : "Test",
    ]),
  );
}

function inputWithProfile(answer: string): {
  answers: Record<string, string>;
  filePaths: string[];
} {
  const answers = baseAnswers();
  answers["hasGoogleProfile"] = answer;
  return { answers, filePaths: [] };
}

function inputWithEin(ein: string) {
  const answers = baseAnswers();
  answers["ein"] = ein;
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

describe("EIN", () => {
  it("is required", () => {
    const result = intakeSchema.safeParse(inputWithEin(""));
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[1] === "ein"));
    }
  });

  it("accepts a filled EIN", () => {
    assert.equal(intakeSchema.safeParse(inputWithEin("12-3456789")).success, true);
  });
});

describe("Uploaded files", () => {
  it("accepts 20 marketing files plus one CP-575 (21 total)", () => {
    const input = inputWithProfile("Yes");
    input.filePaths = Array.from({ length: 21 }, (_, i) => `${i}/file.pdf`);
    assert.equal(intakeSchema.safeParse(input).success, true);
  });

  it("rejects more than 21 files", () => {
    const input = inputWithProfile("Yes");
    input.filePaths = Array.from({ length: 22 }, (_, i) => `${i}/file.pdf`);
    assert.equal(intakeSchema.safeParse(input).success, false);
  });
});
