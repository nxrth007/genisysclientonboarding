import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkAnswer, formatPhoneAsTyped, normalizeAnswer } from "./answer-checks";
import { INTAKE_FIELDS, SHEET_HEADERS } from "./intake-fields";
import { intakeSchema } from "./intake-validation";

/** A complete, correct set of answers. */
function baseAnswers() {
  const answers: Record<string, string> = Object.fromEntries(
    INTAKE_FIELDS.map((field) => [
      field.id,
      field.type === "radio" ? "No" : field.type === "email" ? "test@example.com" : "Test",
    ]),
  );
  Object.assign(answers, {
    ein: "12-3456789",
    fullName: "Maria Lopez",
    businessName: "Lopez Home Services LLC",
    businessContact: "(512) 555-0123",
    businessAddress: "123 Main St, Austin, TX 78701",
    customerPhone: "(512) 555-0188",
    areaCode: "512",
    timeZone: "Central",
    cities: "Austin TX, Round Rock TX",
    website: "https://lopezhomeservices.com",
    socialLinks: "facebook.com/lopezhomeservices",
    yearStarted: "",
    licenseInfo: "",
    reviewLinks: "",
  });
  return answers;
}

function inputWith(fields: Record<string, string>) {
  return { answers: { ...baseAnswers(), ...fields }, filePaths: [] };
}

function issueOn(field: string, fields: Record<string, string>): boolean {
  const result = intakeSchema.safeParse(inputWith(fields));
  return !result.success && result.error.issues.some((issue) => issue.path[1] === field);
}

function messageOn(field: string, fields: Record<string, string>): string {
  const result = intakeSchema.safeParse(inputWith(fields));
  return result.success
    ? ""
    : (result.error.issues.find((issue) => issue.path[1] === field)?.message ?? "");
}

/** The answer as the form stores it, after a successful check. */
function stored(field: string, value: string): string | undefined {
  const result = intakeSchema.safeParse(inputWith({ [field]: value }));
  return result.success ? result.data.answers[field] : undefined;
}

function warningOn(field: string, value: string): string {
  const def = INTAKE_FIELDS.find((f) => f.id === field)!;
  return (
    checkAnswer(def, { ...baseAnswers(), [field]: normalizeAnswer(field, value) }).warning ?? ""
  );
}

function inputWithProfile(answer: string): {
  answers: Record<string, string>;
  filePaths: string[];
} {
  const answers = baseAnswers();
  answers["hasGoogleProfile"] = answer;
  answers["googleProfileLink"] = "https://maps.app.goo.gl/abc123";
  return { answers, filePaths: [] };
}

function inputWithEin(ein: string) {
  const answers = baseAnswers();
  answers["ein"] = ein;
  return { answers, filePaths: [] };
}

describe("A complete form", () => {
  it("passes", () => {
    const result = intakeSchema.safeParse(inputWith({}));
    assert.equal(result.success, true, result.success ? "" : JSON.stringify(result.error.issues));
  });

  it("keeps the questions' wording, which is the Google Sheet's header row", () => {
    assert.equal(SHEET_HEADERS.length, 27);
    assert.equal(SHEET_HEADERS[4], "Business Contact Information");
    assert.equal(SHEET_HEADERS[10], "What cities do you service?");
  });
});

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

  it("needs a link when the answer is Yes", () => {
    assert.ok(issueOn("googleProfileLink", { hasGoogleProfile: "Yes", googleProfileLink: "" }));
    assert.ok(
      issueOn("googleProfileLink", {
        hasGoogleProfile: "Yes",
        googleProfileLink: "Lopez Home Services",
      }),
    );
    assert.equal(
      stored("googleProfileLink", "maps.app.goo.gl/abc123"),
      "https://maps.app.goo.gl/abc123",
    );
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

  it("needs 9 digits, and isn't a Social Security number", () => {
    assert.ok(issueOn("ein", { ein: "12-345678" }));
    assert.match(messageOn("ein", { ein: "123-45-6789" }), /Social Security/);
    assert.equal(stored("ein", "123456789"), "12-3456789");
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

describe("Phone numbers", () => {
  it("take one number: two in one box points to the other phone question", () => {
    assert.match(
      messageOn("customerPhone", { customerPhone: "512-555-0123 and 737-555-0188" }),
      /two numbers.*Business Contact Information/,
    );
    assert.match(
      messageOn("businessContact", { businessContact: "512-555-0123 / 512-555-0188" }),
      /two numbers/,
    );
  });

  it("need all 10 digits of a real US number", () => {
    assert.match(messageOn("customerPhone", { customerPhone: "555-0123" }), /area code/);
    assert.ok(issueOn("customerPhone", { customerPhone: "123-456-7890" }));
    assert.ok(issueOn("customerPhone", { customerPhone: "512-555-01234" }));
    assert.ok(issueOn("customerPhone", { customerPhone: "call me" }));
    assert.ok(issueOn("businessContact", { businessContact: "maria@example.com" }));
  });

  it("are both required", () => {
    assert.ok(issueOn("businessContact", { businessContact: "" }));
    assert.ok(issueOn("customerPhone", { customerPhone: "" }));
  });

  it("are stored as (512) 555-0123", () => {
    for (const typed of ["5125550123", "512.555.0123", "+1 512-555-0123", "1 (512) 555 0123"]) {
      assert.equal(stored("customerPhone", typed), "(512) 555-0123", typed);
    }
  });

  it("format as they're typed", () => {
    assert.equal(formatPhoneAsTyped("512"), "(512");
    assert.equal(formatPhoneAsTyped("5125"), "(512) 5");
    assert.equal(formatPhoneAsTyped("5125550123"), "(512) 555-0123");
    assert.equal(formatPhoneAsTyped("512-555-0123 and"), "512-555-0123 and");
  });
});

describe("Full Name", () => {
  it("is one person's first and last name", () => {
    assert.match(messageOn("fullName", { fullName: "Maria Lopez and Joe Smith" }), /one person/);
    assert.ok(issueOn("fullName", { fullName: "Maria & Joe Lopez" }));
    assert.ok(issueOn("fullName", { fullName: "Maria" }));
    assert.ok(issueOn("fullName", { fullName: "Maria L." }));
    assert.ok(issueOn("fullName", { fullName: "Lopez Home Services LLC" }));
    assert.ok(issueOn("fullName", { fullName: "512-555-0123" }));
  });

  it("accepts real names", () => {
    for (const name of [
      "Maria Lopez",
      "Mary-Jane O'Neil",
      "José García",
      "John Smith, Jr.",
      "Dr. Maria Lopez",
    ]) {
      assert.ok(!issueOn("fullName", { fullName: name }), name);
    }
  });

  it("fixes all-lower and all-upper case", () => {
    assert.equal(stored("fullName", "maria lopez"), "Maria Lopez");
    assert.equal(stored("fullName", "MARIA LOPEZ"), "Maria Lopez");
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
      "Elm Street, Austin, TX 78701",
    ]) {
      assert.ok(issueOn("businessName", { businessName: name }), name);
    }
  });

  it("rejects a phone number, an email or a website", () => {
    for (const name of ["512-555-0123", "maria@example.com", "lopezhomeservices.com"]) {
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

  it("needs the street, city, state and ZIP", () => {
    assert.match(
      messageOn("businessAddress", { businessAddress: "6670 Elm Dr" }),
      /Add the city, state and ZIP code/,
    );
    assert.match(
      messageOn("businessAddress", { businessAddress: "6670 Elm Dr, Austin, TX" }),
      /Add the ZIP code/,
    );
    assert.match(
      messageOn("businessAddress", { businessAddress: "Elm Dr, Austin, TX 78701" }),
      /building number/,
    );
    assert.match(messageOn("businessAddress", { businessAddress: "Austin, TX" }), /town/);
  });

  it("rejects a PO box", () => {
    assert.match(
      messageOn("businessAddress", { businessAddress: "PO Box 921, Minden, NV 89423" }),
      /PO box/,
    );
  });

  it("accepts a street address", () => {
    for (const address of [
      "17434 Copeland Ln, Leander, TX 78641",
      "17434 Copeland Ln Leander TX 78641",
      "123 Main St Suite 200, Austin, TX 78701",
      "RR 2 Box 45, Hico, TX 76457",
      "W204N11509 Goldendale Rd, Germantown, WI 53022",
    ]) {
      assert.ok(!issueOn("businessAddress", { businessAddress: address }), address);
    }
    assert.equal(
      stored("businessAddress", "123 Main St, Austin, TX 78701, USA"),
      "123 Main St, Austin, TX 78701",
    );
  });
});

describe("Cities", () => {
  it("need at least one city with its state", () => {
    assert.match(messageOn("cities", { cities: "Austin, Round Rock" }), /state/);
    assert.match(messageOn("cities", { cities: "Texas" }), /cities too/);
    assert.ok(issueOn("cities", { cities: "78701, 78702" }));
    assert.ok(issueOn("cities", { cities: "123 Main St, Austin, TX 78701" }));
  });

  it("keep each city with its state, the way the Hub reads them", () => {
    assert.equal(stored("cities", "Austin, TX, Round Rock, TX"), "Austin TX, Round Rock TX");
    assert.equal(stored("cities", "Austin and Round Rock, Texas"), "Austin, Round Rock TX");
    assert.equal(
      stored("cities", "Kansas City, Missouri\nOverland Park, Kansas"),
      "Kansas City MO, Overland Park KS",
    );
  });
});

describe("Email, website, area code and time zone", () => {
  it("email must be a real address", () => {
    assert.ok(issueOn("leadEmail", { leadEmail: "maria@example" }));
    assert.ok(issueOn("leadEmail", { leadEmail: "maria@gmail.con" }));
    assert.ok(issueOn("leadEmail", { leadEmail: "a@example.com, b@example.com" }));
    assert.match(warningOn("leadEmail", "maria@gmial.com"), /gmail\.com/);
  });

  it("website is a real web address or N/A", () => {
    assert.equal(stored("website", "lopezhomeservices.com"), "https://lopezhomeservices.com");
    assert.equal(stored("website", "none"), "N/A");
    assert.ok(issueOn("website", { website: "maria@example.com" }));
    assert.ok(issueOn("website", { website: "lopez" }));
    assert.ok(issueOn("website", { website: "lopezhomeservices.con" }));
    assert.match(warningOn("website", "facebook.com/lopez"), /Facebook/);
  });

  it("area code is one 3-digit code", () => {
    assert.equal(stored("areaCode", "(512)"), "512");
    assert.ok(issueOn("areaCode", { areaCode: "512 or 737" }));
    assert.ok(issueOn("areaCode", { areaCode: "512-555-0123" }));
    assert.ok(issueOn("areaCode", { areaCode: "same as my number" }));
  });

  it("time zone isn't a phone number, and common ways of writing it are tidied", () => {
    assert.ok(issueOn("timeZone", { timeZone: "512-555-0123" }));
    assert.equal(stored("timeZone", "CST"), "Central");
    assert.match(warningOn("timeZone", "whenever"), /time zone/);
  });
});

describe("Written answers", () => {
  it("get a friendly note, not a block, when they're an address, phone or email", () => {
    assert.ok(!issueOn("promotions", { promotions: "6670 Elm Dr, Austin, TX 78701" }));
    assert.match(
      warningOn("promotions", "6670 Elm Dr, Austin, TX 78701"),
      /address.*deals or offers/,
    );
    assert.match(warningOn("aboutBusiness", "512-555-0123"), /phone number/);
    assert.equal(warningOn("promotions", "10% off your first job"), "");
    assert.equal(stored("promotions", "none"), "None");
  });
});
