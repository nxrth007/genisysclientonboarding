import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertCustomerSubmissionAvailable, matchesCustomerRecords } from "./customer-validation";

describe("Returning customer authorization", () => {
  it("matches an existing customer's confirmed email without requiring checkout", () => {
    assert.equal(matchesCustomerRecords("Existing@Example.com", [[" existing@example.com "]]), true);
  });
  it("rejects an email not in the customer records", () => {
    assert.equal(matchesCustomerRecords("stranger@example.com", [["existing@example.com"]]), false);
  });
  it("does not treat a partial email match as a customer", () => {
    assert.equal(matchesCustomerRecords("example.com", [["existing@example.com"]]), false);
  });
  it("prevents a second submission by the same customer", () => {
    assert.throws(() => assertCustomerSubmissionAvailable(true));
  });
  it("allows an authorized customer with only an incomplete draft to submit", () => {
    assert.doesNotThrow(() => assertCustomerSubmissionAvailable(false));
  });
});