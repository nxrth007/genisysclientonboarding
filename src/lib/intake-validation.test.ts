import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { INTAKE_FIELDS } from "./intake-fields";
import { intakeSchema } from "./intake-validation";

function baseAnswers() {
  const answers: Record<string, string> = Object.fromEntries(
    INTAKE_FIELDS.map((field) => [
      field.id,
      field.type === "radio" ? "No" : field.type === "email" ? "test@example.com" : "Test",
    ]),
  );
  answers["businessAddress"] = "123 Main St, Austin, TX 78701";
  return answers;
}

function inputWith(fields: Record<string, string>) {
  return { answers: { ...baseAnswers(), ...fields }, filePaths: [] };
}

function issueOn(field: string, fields: Record<string, string>): boolean {
  const result = intakeSchema.safeParse(inputWith(fields));
  return !result.success && result.error.issues.some((issue) => issue.path[1] === field);
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

describe("Legal Business Name", () => {
  it("rejects an address", () => {
    for (const name of [
      "17434 Copeland ln",
      "PO Box 921, Minden, NV 89423",
      "P.O. Box 55",
      "1420 Kimmerling Rd, Gardnerville, NV 89410",
      "88 Oak Ave Apt 4",
      "200 N Main St, Rhome, Texas",
      "4521 W Elm Street Suite 200 Austin TX 78701",
    ]) {
      assert.ok(issueOn("businessName", { businessName: name }), name);
    }
  });

  it("accepts business names, numbers and street words included", () => {
    for (const name of [
      "Calvins Construction LLC",
      "Jake's Property Maintenance",
      "1 Way Construction LLC",
      "Main Street Roofing",
      "5th Avenue Remodeling",
      "360 Home Services",
      "4 Seasons Lawn Care Inc",
      "1 Stop Roofing",
      "7 Hills Paving",
      "24/7 Plumbing & Drain",
      "3 Brothers Painting NY",
      "Route 66 Landscaping",
      "Lakeview Drive Landscaping",
    ]) {
      assert.ok(!issueOn("businessName", { businessName: name }), name);
    }
  });
});

describe("Business Address", () => {
  it("rejects a business name typed as the address", () => {
    assert.ok(issueOn("businessAddress", { businessAddress: "Calvins construction" }));
  });

  it("accepts a street address", () => {
    for (const address of [
      "17434 Copeland Ln, Leander, TX 78641",
      "PO Box 921, Minden, NV 89423",
      "RR 2 Box 45, Hico, TX",
    ]) {
      assert.ok(!issueOn("businessAddress", { businessAddress: address }), address);
    }
  });
});
