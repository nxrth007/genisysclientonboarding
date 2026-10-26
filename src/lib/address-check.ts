/**
 * Telling a business name from an address. Clients have typed their address
 * into "Legal Business Name" (a PO box; "17434 Copeland ln" with the business
 * name in Business Address), and the Hub then names the client after it.
 * "1 Way Construction" and "Main Street Roofing" stay names.
 */

const PO_BOX = /\b(?:p\.?\s*o\.?\s*(?:box|b\b)|post\s+office\s+box|pob\b|box\s+#?\d+)/i;
const SUFFIX =
  "(?:st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|ct|court|cir|circle|way|hwy|highway|pkwy|parkway|pl|place|trl|trail|ter|terrace|loop|pike|plaza|sq|square|cv|cove|pt|point)";
/** A house number and a street ending in Rd, St, Ave…, alone or followed by ", City…": "17434 Copeland ln", "88 Oak Ave Apt 4". */
const STREET = new RegExp(
  `^\\d+[a-z]?\\s+(?:[a-z0-9.'-]+\\s+){0,4}${SUFFIX}\\.?(?:\\s+(?:apt|suite|ste|unit|#)\\s*[a-z0-9-]+)?(?:\\s*,.*)?$`,
  "i",
);
/** A house number and a ZIP: "4521 W Elm Street Suite 200 Austin TX 78701". */
const NUMBER_AND_ZIP = /^\d+[a-z]?\s.*\b\d{5}(?:-\d{4})?$/i;

export function looksLikeAddress(value: string): boolean {
  const s = value.replace(/\s+/g, " ").trim();
  if (!s) return false;
  return PO_BOX.test(s) || STREET.test(s) || NUMBER_AND_ZIP.test(s);
}

/** A business address has a number somewhere (the street's, or the ZIP); a name in that box doesn't. */
export function hasAddressNumber(value: string): boolean {
  return /\d/.test(value);
}
