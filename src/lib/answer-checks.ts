import { z } from "zod";

import { looksLikeAddress } from "./address-check";
import type { IntakeField } from "./intake-fields";

/**
 * What each onboarding answer needs, in plain English.
 *
 * Clients have typed two phone numbers into one box ("555-… and 555-…"), two
 * owners into Full Name, a street with no city, state or ZIP as the business
 * address, their address as a promotion, and their business name and address
 * in each other's boxes. The Lead Genisys Hub builds their website and files
 * their texting registration (Twilio toll-free / A2P) from these answers, so a
 * sloppy one comes back days later as a failed filing.
 *
 * - checkAnswer: an `error` blocks submitting (on the page, and on the server
 *   through intake-validation.ts); a `warning` asks for a second look and
 *   never blocks.
 * - normalizeAnswer: tidies an answer into the shape the Hub reads best: one
 *   phone format, "City ST" lists, websites with https://. Safe to run twice.
 *
 * The questions' labels never change here: they are the Google Sheet's
 * column headers, which the Hub's sheet reader matches.
 */

export type AnswerCheck = { error?: string; warning?: string };
type Answers = Record<string, string>;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

/** "city, state and ZIP code" */
function listWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

// ---------------------------------------------------------------- US states

const STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};
const NAME_TO_CODE = new Map<string, string>([
  ...Object.entries(STATES).map(([code, name]) => [name.toLowerCase(), code] as [string, string]),
  ["washington dc", "DC"],
  ["washington d.c", "DC"],
]);
// Longest names first, so "West Virginia" wins over "Virginia".
const STATE_PATTERN = [
  ...[...NAME_TO_CODE.keys()]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/\./g, "\\.").replace(/ /g, "\\s+")),
  ...Object.keys(STATES),
].join("|");
/** A state at the end of some text, maybe with its ZIP: "Austin TX", "Austin, Texas 78701". */
const STATE_AT_END = new RegExp(
  `(?:^|[\\s,])(${STATE_PATTERN})\\.?(?:\\s+(\\d{5})(?:-\\d{4})?)?$`,
  "i",
);
/** Only a state, maybe with its ZIP: "TX", "Texas", "TX 78701". */
const STATE_ONLY = new RegExp(`^(${STATE_PATTERN})\\.?(?:\\s+(\\d{5})(?:-\\d{4})?)?$`, "i");
const STATE_NAME_IN = new RegExp(
  `\\b(?:${[...NAME_TO_CODE.keys()].map((n) => n.replace(/\./g, "\\.").replace(/ /g, "\\s+")).join("|")})\\b`,
  "i",
);

/** "TX", "tx", "Texas" → "TX"; anything else → "". */
export function stateCode(s: string): string {
  const t = clean(s).replace(/\.$/, "").toLowerCase();
  if (t.length === 2 && STATES[t.toUpperCase()]) return t.toUpperCase();
  return NAME_TO_CODE.get(t) ?? "";
}

// ------------------------------------------------------- what an answer is

const EMAIL = /^[^\s@,;:<>()"']+@[^\s@,;:<>()"']+\.[a-z]{2,}$/i;
const hasEmail = (s: string) => /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s);
const PHONE_CHARS = /^[\d\s().+-]+$/;
/** A phone number typed on its own: "8302379649", "(830) 237-9649", "+1 830-237-9649". */
export function looksLikePhone(s: string): boolean {
  const t = clean(s);
  return PHONE_CHARS.test(t) && t.replace(/\D/g, "").length >= 7;
}
/** A bare web address: http(s)://…, www.…, or one word ending in .com, .net… */
const WEB_ONLY =
  /^(?:https?:\/\/\S+|www\.\S+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|us|biz|info|io|pro|services|company|site|online|app|page|me|llc|construction|contractors|builders|roofing|repair|homes)(?:\/\S*)?)$/i;
const isWebsite = (s: string) => WEB_ONLY.test(clean(s));
/** Answers that mean "I don't have one". */
const NONE =
  /^(?:n\/?a|n\.a\.?|none|no|nope|nothing|no website|no site|not yet|none yet|don'?t have (?:one|a website|any)|do not have (?:one|a website|any)|-+|x)$/i;
const isNone = (s: string) => NONE.test(clean(s).replace(/[.!]+$/, ""));

/** Endings that are always a typo: abc@gmail.con, abcroofing.cmo. */
const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cmo: "com",
  ocm: "com",
  vom: "com",
  xom: "com",
  cpm: "com",
  comm: "com",
  coom: "com",
  nte: "net",
  ner: "net",
  ogr: "org",
  rog: "org",
};
/** Misspelled email providers: a nudge, since a real domain could look like one. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.co": "icloud.com",
  "aol.co": "aol.com",
};
const FREE_MAIL =
  /^(?:gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|att|verizon|protonmail|proton)\.[a-z.]+$/i;

/** The host of a web address typed with or without https://, lower case; "" when it isn't one. */
function hostOf(s: string): string {
  const t = clean(s);
  if (!t || /\s|@/.test(t)) return "";
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase();
  } catch {
    return "";
  }
}
const REAL_HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Which social or listing site a host is, for "that's a Facebook page, not a website". */
function siteKind(host: string): string {
  const h = host.replace(/^(?:www|m|mobile|web)\./, "");
  if (/^(?:facebook\.com|fb\.com|fb\.me)$/.test(h)) return "Facebook";
  if (h === "instagram.com") return "Instagram";
  if (h === "tiktok.com") return "TikTok";
  if (h === "x.com" || h === "twitter.com") return "X (Twitter)";
  if (h === "linkedin.com") return "LinkedIn";
  if (h === "yelp.com") return "Yelp";
  if (h === "nextdoor.com") return "Nextdoor";
  if (isGoogleHost(h)) return "Google";
  return "";
}
const isGoogleHost = (h: string) =>
  /(?:^|\.)(?:goo\.gl|g\.page|g\.co|share\.google|google\.[a-z.]+)$/.test(h);

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_m, before: string, c: string) => before + c.toUpperCase());

// --------------------------------------------------------------- phones

/** The digits of a US number, without a leading 1. */
export function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
}
const fmtPhone = (d: string) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
/** Area code and exchange start with 2–9, and the area code isn't 411, 911… */
const realUsNumber = (d: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(d) && !/^[2-9]11/.test(d);
/** US numbers inside text: "512-555-0123 and 737-555-0188" holds two. */
const PHONE_IN = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/**
 * "(512) 555-0123" as they type. Anything that isn't one number on its way
 * (letters, a second number) is left exactly as typed, for the check to explain.
 */
export function formatPhoneAsTyped(raw: string): string {
  if (!PHONE_CHARS.test(raw)) return raw;
  let d = raw.replace(/\D/g, "");
  let lead = "";
  if (d.startsWith("1")) {
    // A country code: no US area code starts with 1.
    lead = "1 ";
    d = d.slice(1);
  }
  if (d.length > 10) return raw;
  if (!d) return lead.trim();
  if (d.length <= 3) return `${lead}(${d}`;
  if (d.length <= 6) return `${lead}(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `${lead}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function normalizePhone(v: string): string {
  const s = clean(v);
  const d = phoneDigits(s);
  return PHONE_CHARS.test(s) && d.length === 10 ? fmtPhone(d) : s;
}

const EXAMPLE_PHONE = "(512) 555-0123";

function checkPhone(v: string, field: "businessContact" | "customerPhone"): AnswerCheck {
  const s = clean(v);
  if (!s) return { error: `Enter a phone number, e.g. ${EXAMPLE_PHONE}.` };
  const d = phoneDigits(s);
  if ((s.match(PHONE_IN) ?? []).length > 1 || d.length >= 20) {
    return {
      error:
        field === "customerPhone"
          ? "That's two numbers. Enter just one here: the number customers should call. Your other number can go in Business Contact Information above."
          : "That's two numbers. Enter just one here: the best number to reach you directly. The number customers should call goes in the phone question below.",
    };
  }
  if (s.includes("@")) {
    return {
      error: `That's an email address. Enter a phone number here, e.g. ${EXAMPLE_PHONE}. Your email goes in the email question below.`,
    };
  }
  if (/\b(?:ext|extension|x)\.?\s*\d+$/i.test(s)) {
    return { error: `Leave off the extension: just the 10-digit number, e.g. ${EXAMPLE_PHONE}.` };
  }
  if (!PHONE_CHARS.test(s))
    return { error: `Enter just the phone number, in digits, e.g. ${EXAMPLE_PHONE}.` };
  if (d.length === 7)
    return { error: `Add the area code. A US phone number has 10 digits, e.g. ${EXAMPLE_PHONE}.` };
  if (d.length < 10) {
    return {
      error: `That's too short. A US phone number has 10 digits, including the area code, e.g. ${EXAMPLE_PHONE}.`,
    };
  }
  if (d.length > 10) {
    return {
      error: `That's too many digits. A US phone number has 10, e.g. ${EXAMPLE_PHONE}. Just one number, please.`,
    };
  }
  if (!realUsNumber(d))
    return {
      error: "That isn't a working US phone number. Please check the area code and the number.",
    };
  return {};
}

// ---------------------------------------------------------------- names

const PERSON_SUFFIX = /^(?:jr|sr|ii|iii|iv|v|md|phd|dds|esq)\.?$/i;
const HONORIFIC = /^(?:mr|mrs|ms|miss|dr)\.?$/i;
/** Words a person's name never has. */
const COMPANY_WORD =
  /\b(?:llc|inc|corp|corporation|ltd|company|construction|contracting|contractors?|roofing|remodeling|renovations?|landscaping|plumbing|cleaning|painting|services|solutions|enterprises?|exteriors|restoration|builders|group)\b|\bl\.l\.c\b|\sco\.?$/i;
const ONE_PERSON = "Just one person here: the owner or main contact, e.g. Maria Lopez.";
const EXAMPLE_NAME = "e.g. Maria Lopez";

function normalizeName(v: string): string {
  const s = clean(v);
  // Only re-case something that is all names: "MARIA LOPEZ" or "maria lopez" → "Maria Lopez".
  if (!/^[\p{L}\s.,'’-]+$/u.test(s)) return s;
  return s === s.toLowerCase() || s === s.toUpperCase() ? titleCase(s) : s;
}

function checkFullName(v: string): AnswerCheck {
  const s = clean(v);
  if (!s) return { error: `Enter your first and last name, ${EXAMPLE_NAME}.` };
  if (s.includes("@")) {
    return {
      error: `That's an email address. Put your first and last name here, ${EXAMPLE_NAME}. Your email goes in the email question below.`,
    };
  }
  if (/\d/.test(s)) {
    return {
      error: looksLikePhone(s)
        ? `That's a phone number. Put your first and last name here, ${EXAMPLE_NAME}.`
        : `A name doesn't have numbers in it. Put your first and last name here, ${EXAMPLE_NAME}.`,
    };
  }
  if (/\s(?:and|or)\s|[&+/;]/i.test(s)) return { error: ONE_PERSON };
  if (COMPANY_WORD.test(s)) {
    return {
      error: `That looks like a business name. Put your own first and last name here, ${EXAMPLE_NAME}. The business name goes in Legal Business Name below.`,
    };
  }
  const [main = "", ...after] = s.split(",").map((p) => p.trim());
  const extra = after.filter((p) => p && !PERSON_SUFFIX.test(p));
  if (extra.length) {
    return {
      error: extra.some((p) => p.split(" ").length >= 2)
        ? ONE_PERSON
        : `Write just your name, first name first, ${EXAMPLE_NAME}.`,
    };
  }
  const words = main.split(" ").filter((w) => w && !HONORIFIC.test(w) && !PERSON_SUFFIX.test(w));
  if (words.length < 2) return { error: `Enter your first and last name, ${EXAMPLE_NAME}.` };
  if (words.length > 6 || s.length > 70) {
    return {
      error: `That's long for one person's name. Just your first and last name, please, ${EXAMPLE_NAME}.`,
    };
  }
  if (/^\p{L}\.?$/u.test(words[words.length - 1] ?? "")) {
    return { error: "Write your whole last name, not just its first letter." };
  }
  return {};
}

// -------------------------------------------------------- business name

/** "…, VA 20169": a town's state and ZIP, which no business name ends with. */
const ENDS_STATE_ZIP = new RegExp(`[\\s,](?:${STATE_PATTERN})\\.?\\s+\\d{5}(?:-\\d{4})?$`, "i");

function checkBusinessName(v: string): AnswerCheck {
  const s = clean(v);
  if (!s)
    return {
      error: "Enter your business's legal name, exactly as it appears on your IRS CP-575 letter.",
    };
  if (hasEmail(s)) {
    return {
      error:
        "That's an email address. Put your business's legal name here. Your email goes in the email question below.",
    };
  }
  if (looksLikePhone(s)) {
    return {
      error:
        "That's a phone number. Put your business's legal name here. Phone numbers go in Business Contact Information and the phone question below.",
    };
  }
  if (looksLikeAddress(s) || ENDS_STATE_ZIP.test(s)) {
    return {
      error:
        "That looks like an address. Put your business's legal name here; your address goes in Business Address below.",
    };
  }
  if (isWebsite(s)) {
    return {
      error:
        "That's a web address. Put your business's legal name here. Your website goes in the website question below.",
    };
  }
  if (letters(s) < 2)
    return { error: "Enter your business's legal name, e.g. Lopez Home Services LLC." };
  return {};
}

// ---------------------------------------------------------------- address

const PO_BOX = /\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box|pob\s*#?\d)/i;
/** Rural route and highway contract boxes are where the business is ("RR 2 Box 45"). */
const RURAL = /^(?:rr|r\.r\.|rural\s+route|hc|star\s+route)\s*#?\d+/i;
/** A building number to start: "123 Main St", "12B Oak Ave", "W204N11509 Goldendale Rd". */
const STREET_START = /^(?:\d+[a-z]?(?:[-/]\d+[a-z]?)?|[nsew]\d+[nsew]\d+)\s+\S/i;
const SUFFIX_WORD =
  /^(?:st|street|ave|av|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|ct|court|cir|circle|way|hwy|highway|pkwy|parkway|pl|place|trl|trail|ter|terrace|loop|pike|plaza|sq|square|cv|cove|pt|point|run|path|pass|row|xing|crossing|bend|ridge|expy|fwy|tpke|byp|rte|route|aly|alley|walk)\.?$/i;
const UNIT_WORD =
  /^(?:ste|suite|apt|apartment|unit|bldg|building|fl|floor|rm|room|lot|spc|space|#\S*)\.?$/i;
const isCity = (c: string) =>
  /^\p{L}/u.test(c) && !UNIT_WORD.test(c.split(" ")[0] ?? "") && !SUFFIX_WORD.test(c);
const EXAMPLE_ADDRESS = "123 Main St, Austin, TX 78701";

export type UsAddress = { street: string; city: string; state: string; zip: string };

/** Street, city, state and ZIP out of a typed address. Parts it can't find are "". */
export function parseUsAddress(raw: string): UsAddress {
  let s = clean(raw.replace(/\r?\n+/g, ", "))
    .replace(/[\s,]*(?:u\.?s\.?a?\.?|united states(?: of america)?)\.?$/i, "")
    .replace(/[\s,.]+$/, "");
  let zip = "";
  const z = /[\s,]+(\d{5})(?:-\d{4})?$/.exec(s);
  if (z) {
    zip = z[1] ?? "";
    s = s.slice(0, z.index).replace(/[\s,]+$/, "");
  }
  let state = "";
  const st = new RegExp(`(?:^|[\\s,])(${STATE_PATTERN})\\.?$`, "i").exec(s);
  if (st) {
    state = stateCode(st[1] ?? "");
    if (state) s = s.slice(0, st.index).replace(/[\s,]+$/, "");
  }
  const parts = s.split(",").map(clean).filter(Boolean);
  let street = "";
  let city = "";
  if (parts.length >= 2) {
    city = parts[parts.length - 1] ?? "";
    street = parts.slice(0, -1).join(", ");
  } else if (parts[0]) {
    // No commas: the town is what follows the street's ending ("123 Main St Austin").
    const words = parts[0].split(" ");
    let end = -1;
    for (let i = words.length - 2; i >= 1; i--) {
      if (SUFFIX_WORD.test(words[i] ?? "")) {
        end = i;
        break;
      }
    }
    if (end >= 0) {
      let from = end + 1;
      // "Suite 200", "Apt 4B" and "#12" are still the street.
      while (from < words.length && UNIT_WORD.test(words[from] ?? ""))
        from += /^#/.test(words[from] ?? "") ? 1 : 2;
      street = words.slice(0, from).join(" ");
      city = words.slice(from).join(" ");
    } else if (STREET_START.test(parts[0]) || RURAL.test(parts[0])) {
      const last = words[words.length - 1] ?? "";
      const lastIsTown = words.length >= 3 && !SUFFIX_WORD.test(last);
      street = lastIsTown ? words.slice(0, -1).join(" ") : parts[0];
      city = lastIsTown ? last : "";
    } else {
      city = parts[0];
    }
  }
  return { street, city, state, zip };
}

function normalizeAddress(v: string): string {
  return clean(v.replace(/\r?\n+/g, ", "))
    .replace(/[\s,]*(?:u\.?s\.?a\.?|united states(?: of america)?)\.?$/i, "")
    .replace(/[\s,]+$/, "");
}

function checkAddress(v: string): AnswerCheck {
  const s = clean(v);
  const pick = "Start typing your address and pick it from the list.";
  if (!s) return { error: `Enter the business's street address. ${pick}` };
  if (hasEmail(s))
    return {
      error: `That's an email address. Enter the street address where the business is based, e.g. ${EXAMPLE_ADDRESS}.`,
    };
  if (looksLikePhone(s))
    return {
      error: `That's a phone number. Enter the street address where the business is based, e.g. ${EXAMPLE_ADDRESS}.`,
    };
  if (isWebsite(s))
    return {
      error: `That's a web address. Enter the street address where the business is based, e.g. ${EXAMPLE_ADDRESS}.`,
    };
  if (PO_BOX.test(s)) {
    return {
      error:
        "A PO box can't be used here. Enter the street address where the business is based. If you work from home, use your home address.",
    };
  }
  const p = parseUsAddress(s);
  if (!/\d/.test(s)) {
    // No number at all: a town, or the business's name in the wrong box.
    return {
      error:
        p.state || STATE_NAME_IN.test(s)
          ? `That's a town, not a street address. Enter the full address with the building number, e.g. ${EXAMPLE_ADDRESS}. ${pick}`
          : `That looks like a business name, not an address. Enter the business's street address here, e.g. ${EXAMPLE_ADDRESS}. Your business name goes in Legal Business Name above.`,
    };
  }
  if (!STREET_START.test(p.street) && !RURAL.test(p.street)) {
    return { error: `Start with the building number and street, e.g. ${EXAMPLE_ADDRESS}. ${pick}` };
  }
  const missing = [!isCity(p.city) && "city", !p.state && "state", !p.zip && "ZIP code"].filter(
    (w): w is string => !!w,
  );
  if (missing.length) {
    return {
      error: `Add the ${listWords(missing)}, e.g. ${EXAMPLE_ADDRESS}. Easiest: ${pick.toLowerCase()}`,
    };
  }
  return {};
}

// -------------------------------------------------------------- area code

function normalizeAreaCode(v: string): string {
  const s = clean(v);
  return /^\(?\d{3}\)?$/.test(s) ? s.replace(/\D/g, "") : s;
}

function checkAreaCode(v: string): AnswerCheck {
  const s = clean(v);
  const hint = "Not sure? Use the one from your business phone number.";
  if (!s) return { error: `Enter a 3-digit area code, e.g. 512. ${hint}` };
  const d = s.replace(/\D/g, "");
  if (d.length >= 10)
    return { error: "Just the 3-digit area code, not the whole phone number, e.g. 512." };
  if ((s.match(/\d{3}/g) ?? []).length > 1)
    return { error: "Just one area code, please, e.g. 512." };
  if (!/^\(?\d{3}\)?$/.test(s))
    return {
      error: d
        ? "An area code is 3 digits, e.g. 512."
        : `Enter a 3-digit area code, e.g. 512. ${hint}`,
    };
  if (!/^[2-9]\d{2}$/.test(d) || /^[2-9]11$/.test(d))
    return { error: "That isn't a US area code. Please check it." };
  return {};
}

// -------------------------------------------------------------- time zone

const ZONE_WORDS: Record<string, string> = {
  eastern: "Eastern",
  est: "Eastern",
  edt: "Eastern",
  et: "Eastern",
  central: "Central",
  cst: "Central",
  cdt: "Central",
  ct: "Central",
  mountain: "Mountain",
  mst: "Mountain",
  mdt: "Mountain",
  mt: "Mountain",
  pacific: "Pacific",
  pst: "Pacific",
  pdt: "Pacific",
  pt: "Pacific",
  alaska: "Alaska",
  akst: "Alaska",
  akdt: "Alaska",
  hawaii: "Hawaii",
  hst: "Hawaii",
};
const ZONE_HINT =
  /\b(?:eastern|central|mountain|pacific|alaska|hawaii|arizona|atlantic|est|edt|et|cst|cdt|ct|mst|mdt|mt|pst|pdt|pt|akst|akdt|hst|gmt|utc|new york|chicago|denver|phoenix|los angeles)\b/i;
const ZONES = "Eastern, Central, Mountain, Pacific, Alaska or Hawaii";

function normalizeTimeZone(v: string): string {
  const s = clean(v);
  const key = s
    .toLowerCase()
    .replace(/\b(?:standard|daylight|time|zone)\b/g, "")
    .replace(/[^a-z]/g, "");
  return ZONE_WORDS[key] ?? s;
}

function checkTimeZone(v: string): AnswerCheck {
  const s = clean(v);
  if (!s) return { error: `Enter your time zone: ${ZONES}.` };
  const what = hasEmail(s)
    ? "an email address"
    : looksLikePhone(s)
      ? "a phone number"
      : isWebsite(s)
        ? "a web address"
        : looksLikeAddress(s)
          ? "an address"
          : "";
  if (what) return { error: `That looks like ${what}. Enter your time zone here: ${ZONES}.` };
  if (!ZONE_HINT.test(s) && !STATE_NAME_IN.test(s)) {
    return { warning: `We couldn't tell which time zone that is. Write ${ZONES}.` };
  }
  return {};
}

// ------------------------------------------------------------------ email

const emailSchema = z.string().email();

function normalizeEmail(v: string): string {
  return v
    .trim()
    .replace(/^mailto:/i, "")
    .toLowerCase();
}

function checkEmail(v: string): AnswerCheck {
  const s = v.trim();
  const example = "you@yourbusiness.com";
  if (!s) return { error: `Enter your email address, e.g. ${example}.` };
  if ((s.match(/[^\s@,;:<>()"']+@[^\s@,;:<>()"']+/g) ?? []).length > 1)
    return { error: "Enter just one email address." };
  if (!s.includes("@")) {
    return {
      error: looksLikePhone(s)
        ? `That's a phone number. Enter your email address here, e.g. ${example}.`
        : `An email address needs an @, e.g. ${example}.`,
    };
  }
  if (/\s/.test(s)) return { error: "An email address can't have spaces in it. Please check it." };
  if (!EMAIL.test(s) || !emailSchema.safeParse(s).success) {
    return { error: `That isn't a complete email address. It should look like ${example}.` };
  }
  const [local = "", domain = ""] = s.toLowerCase().split("@");
  const tld = domain.split(".").pop() ?? "";
  const fixedTld = TLD_TYPOS[tld];
  if (fixedTld)
    return {
      error: `Check the ending: did you mean ${local}@${domain.replace(/[a-z]+$/, fixedTld)}?`,
    };
  const fixedDomain = DOMAIN_TYPOS[domain];
  if (fixedDomain) return { warning: `Did you mean ${local}@${fixedDomain}? Please check it.` };
  return {};
}

// ----------------------------------------------------------------- cities

/** The Hub splits a city list on commas, so "Austin, TX" would read as two places: keep each city and its state together. */
const STATE_END_IN_ENTRY = (e: string) => STATE_AT_END.test(e);

function cityEntries(v: string): string[] {
  return v
    .split(/\r?\n|[,;/|•]|\s+(?:and|&)\s+|&/i)
    .map((e) =>
      clean(e)
        .replace(/^(?:and|&|[-*•])\s*/i, "")
        .replace(/[.\s]+$/, ""),
    )
    .filter(Boolean);
}

/** "Austin, TX, Round Rock, Texas" → "Austin TX, Round Rock TX". */
export function normalizeCities(v: string): string {
  const out: string[] = [];
  for (const entry of cityEntries(v)) {
    const m = STATE_ONLY.exec(entry);
    const code = m ? stateCode(m[1] ?? "") : "";
    const prev = out[out.length - 1];
    if (code && prev !== undefined && !STATE_END_IN_ENTRY(prev)) {
      out[out.length - 1] = `${prev} ${code}${m?.[2] ? ` ${m[2]}` : ""}`;
    } else {
      out.push(entry);
    }
  }
  return out.join(", ");
}

function checkCities(v: string): AnswerCheck {
  const s = clean(v);
  const example = "e.g. Austin TX, Round Rock TX";
  if (!s) return { error: `List the cities you serve, each with its state, ${example}.` };
  const what = hasEmail(s)
    ? "an email address"
    : looksLikePhone(s)
      ? "a phone number"
      : isWebsite(s)
        ? "a web address"
        : "";
  if (what)
    return {
      error: `That looks like ${what}. List the cities you serve here, each with its state, ${example}.`,
    };
  if (looksLikeAddress(s) || PO_BOX.test(s)) {
    return {
      error: `That looks like a street address. List the cities or towns you serve here, each with its state, ${example}. Your address goes in Business Address.`,
    };
  }
  const entries = cityEntries(normalizeCities(s));
  const withState = entries.some((e) => {
    if (STATE_ONLY.test(e)) return false;
    return STATE_END_IN_ENTRY(e) || (STATE_NAME_IN.test(e) && e.split(" ").length >= 2);
  });
  if (withState) return {};
  if (entries.every((e) => STATE_ONLY.test(e)))
    return { error: `Add the cities too, each with its state, ${example}.` };
  if (entries.every((e) => /^\d{5}(?:-\d{4})?$/.test(e))) {
    return { error: `List the cities rather than ZIP codes, each with its state, ${example}.` };
  }
  return { error: `Add the state after each city, ${example}.` };
}

// ---------------------------------------------------------------- website

function normalizeWebsite(v: string): string {
  const s = clean(v).replace(/[,;]+$/, "");
  if (!s) return "";
  if (isNone(s)) return "N/A";
  const host = hostOf(s);
  if (!host || !REAL_HOST.test(host)) return s;
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`);
    const href = url.href;
    return url.pathname === "/" && !url.search && !url.hash ? href.replace(/\/$/, "") : href;
  } catch {
    return s;
  }
}

function checkWebsite(v: string): AnswerCheck {
  const s = clean(v);
  const orNone = "or write N/A if you don't have one";
  const example = "https://yourbusiness.com";
  if (!s) return { error: `Paste your website's address, e.g. ${example}, ${orNone}.` };
  if (s === "N/A") return {};
  if (hasEmail(s))
    return {
      error: `That's an email address. Paste your website's address here, e.g. ${example}, ${orNone}.`,
    };
  if (looksLikePhone(s))
    return {
      error: `That's a phone number. Paste your website's address here, e.g. ${example}, ${orNone}.`,
    };
  if (s.split(" ").filter((w) => /\.[a-z]{2,}/i.test(w)).length > 1)
    return { error: "Just one website, please: your main one." };
  if (/\s/.test(s)) return { error: `Paste just the web address, e.g. ${example}, ${orNone}.` };
  const host = hostOf(s);
  if (!host || !REAL_HOST.test(host)) {
    return {
      error: `That isn't a complete web address. It should look like ${example}, ${orNone}.`,
    };
  }
  const fixed = TLD_TYPOS[host.split(".").pop() ?? ""];
  if (fixed) return { error: `Check the ending: did you mean .${fixed}?` };
  const kind = siteKind(host);
  if (kind === "Google") {
    return {
      warning:
        "That's a Google Maps link, not a website. If you don't have a website, write N/A. Your Google listing goes in the Google Business Profile question below.",
    };
  }
  if (kind) {
    return {
      warning: `That's a ${kind} page, not a website. If you don't have a website, write N/A. Your social pages go in the social media question below.`,
    };
  }
  return {};
}

// ----------------------------------------------------------------- domain

function normalizeDomain(v: string): string {
  const s = clean(v).toLowerCase();
  if (!s || /\s|@/.test(s)) return s;
  return s
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

function checkDomain(v: string): AnswerCheck {
  const s = clean(v);
  const example = "e.g. yourbusiness.com";
  if (!s) return { error: `Enter your domain, ${example}.` };
  if (s.includes("@"))
    return { error: `That's an email address. Enter just your domain, ${example}.` };
  const host = normalizeDomain(s);
  if (!REAL_HOST.test(host)) return { error: `Enter just the domain, ${example}.` };
  const fixed = TLD_TYPOS[host.split(".").pop() ?? ""];
  if (fixed) return { error: `Check the ending: did you mean .${fixed}?` };
  if (FREE_MAIL.test(host) || siteKind(host)) {
    return {
      error: `${host} isn't a domain you own. Enter your own domain, ${example}, or choose No above if you don't have one.`,
    };
  }
  return {};
}

// ---------------------------------------------- Google Business Profile link

function normalizeLink(v: string): string {
  const s = clean(v);
  if (!s || /\s|@/.test(s) || /^https?:\/\//i.test(s)) return s;
  const host = hostOf(s);
  return host && REAL_HOST.test(host) ? `https://${s}` : s;
}

function checkGoogleLink(v: string): AnswerCheck {
  const s = clean(v);
  const how =
    "Open Google Maps, search your business name, tap Share, then Copy link, and paste it here.";
  if (!s) return { error: `Paste the link to your Google listing. ${how}` };
  const host = hostOf(s);
  if (!host || !REAL_HOST.test(host))
    return { error: `That isn't a link. ${how} It starts with https://maps.app.goo.gl/` };
  if (!isGoogleHost(host)) {
    return {
      warning:
        "That doesn't look like a Google Maps link. It usually starts with https://maps.app.goo.gl/ (in Google Maps: Share, then Copy link).",
    };
  }
  return {};
}

// ------------------------------------------------------------------- EIN

const SSN = /^\d{3}[\s-]\d{2}[\s-]\d{4}$/;
const EIN_LABEL = /^(?:f?ein|tax\s*id|tin)\s*(?:#|no\.?|number)?\s*[:#-]?\s*/i;

function normalizeEin(v: string): string {
  const s = clean(v);
  const bare = s.replace(EIN_LABEL, "");
  const d = bare.replace(/\D/g, "");
  return d.length === 9 && /^[\d\s-]+$/.test(bare) && !SSN.test(bare)
    ? `${d.slice(0, 2)}-${d.slice(2)}`
    : s;
}

function checkEin(v: string): AnswerCheck {
  const s = clean(v);
  const where = "It's on your IRS CP-575 letter.";
  if (!s) return { error: `Enter your EIN: 9 digits, like 12-3456789. ${where}` };
  if (SSN.test(s.replace(EIN_LABEL, ""))) {
    return {
      error:
        "That looks like a Social Security number. Enter your business's EIN instead: 9 digits, like 12-3456789, from your IRS CP-575 letter.",
    };
  }
  const d = s.replace(/\D/g, "");
  if (d && d.length !== 9)
    return { error: `An EIN has 9 digits, like 12-3456789. Please check it. ${where}` };
  return {};
}

// ------------------------------------------------------------------- year

function checkYear(v: string): AnswerCheck {
  const s = clean(v);
  if (!s) return {};
  const year = /\b(1[89]\d{2}|20\d{2})\b/.exec(s);
  if (year) {
    return Number(year[1]) > new Date().getFullYear()
      ? { error: "That year hasn't happened yet. What year did the business start?" }
      : {};
  }
  // "25 years": the Hub works the year out from that.
  if (/\d+\s*\+?\s*(?:years?|yrs?)\b/i.test(s)) return {};
  if (/^\d{2}$/.test(s)) return { error: "Write the whole year, e.g. 2012." };
  return { error: "Enter the year the business started, e.g. 2012, or leave this blank." };
}

// ------------------------------------------------- answers written in words

/** What each written answer is about, for "that looks like an address; this question asks…". */
const TOPIC: Record<string, string> = {
  aboutBusiness:
    "This question is about your business: a few sentences on what you do, who you serve and how long you've been doing it.",
  mainServices:
    "This question asks which services you want to promote, e.g. Roof repair, roof replacement, gutters.",
  promotions:
    "This question asks about deals or offers you run, e.g. 10% off your first job, or Free estimates. If you don't have any, write None.",
  whyChooseYou:
    "This question asks why customers should pick you, e.g. Family-owned, 15 years' experience, licensed and insured.",
  brandColors:
    "This question asks about your colors and style, e.g. Navy blue and white, clean and modern.",
  faqs: "This question asks for questions customers often ask you, with your answers.",
  socialLinks:
    "This question asks for links to your social media pages, e.g. facebook.com/yourbusiness, or N/A if you don't have any.",
  licenseInfo: "This question asks for your contractor license number and who issued it.",
  reviewLinks:
    "This question asks for links to your pages on review sites, e.g. yelp.com/biz/yourbusiness.",
};

/** A friendly second look when a written answer is plainly something else. Never blocks. */
function writtenAnswerWarning(id: string, v: string): AnswerCheck {
  const s = clean(v);
  const topic = TOPIC[id] ?? "";
  if (!s || isNone(s)) return {};
  const what =
    hasEmail(s) && EMAIL.test(s)
      ? "an email address"
      : looksLikePhone(s)
        ? "a phone number"
        : looksLikeAddress(s) || PO_BOX.test(s)
          ? "an address"
          : "";
  if (what) return { warning: `That looks like ${what}. ${topic}` };
  const linkAnswer = id === "socialLinks" || id === "reviewLinks";
  if (linkAnswer) {
    if (/(?:^|\s)@[a-z0-9_.]{2,}/i.test(s) && !/\.[a-z]{2,}/i.test(s)) {
      return {
        warning:
          "Paste the full links, e.g. facebook.com/yourbusiness. A handle like @yourbusiness is hard for us to find.",
      };
    }
    if (!/\.[a-z]{2,}/i.test(s)) return { warning: `Paste the full links to your pages. ${topic}` };
    return {};
  }
  if (isWebsite(s) && id !== "brandColors" && id !== "licenseInfo") {
    return { warning: `That's just a link. Please tell us in your own words. ${topic}` };
  }
  if (letters(s) < 2) return { warning: `Could you add a little more? ${topic}` };
  return {};
}

function normalizeWritten(id: string, v: string): string {
  const s = v.trim();
  if (!isNone(s)) return s;
  return id === "promotions" ? "None" : "N/A";
}

// ------------------------------------------------------------------ public

/** An answer tidied the way the form stores it. Running it twice changes nothing. */
export function normalizeAnswer(id: string, value: string): string {
  switch (id) {
    case "ein":
      return normalizeEin(value);
    case "fullName":
      return normalizeName(value);
    case "businessName":
      return clean(value);
    case "businessContact":
    case "customerPhone":
      return normalizePhone(value);
    case "businessAddress":
      return normalizeAddress(value);
    case "areaCode":
      return normalizeAreaCode(value);
    case "timeZone":
      return normalizeTimeZone(value);
    case "leadEmail":
      return normalizeEmail(value);
    case "cities":
      return normalizeCities(value);
    case "website":
      return normalizeWebsite(value);
    case "domainName":
      return normalizeDomain(value);
    case "googleProfileLink":
      return normalizeLink(value);
    case "promotions":
    case "socialLinks":
    case "reviewLinks":
      return normalizeWritten(id, value);
    default:
      return value.trim();
  }
}

export function normalizeAnswers(answers: Answers): Answers {
  return Object.fromEntries(
    Object.entries(answers).map(([id, value]) => [id, normalizeAnswer(id, value)]),
  );
}

/** Shown to the client: does this question apply (a follow-up only shows after its trigger answer)? */
export function isAsked(field: IntakeField, answers: Answers): boolean {
  return !field.requiredWhen || answers[field.requiredWhen.field] === field.requiredWhen.equals;
}

/**
 * What's wrong with an answer (`error`, blocks submitting) or worth a second
 * look (`warning`, doesn't). Expects normalized answers.
 */
export function checkAnswer(field: IntakeField, answers: Answers): AnswerCheck {
  if (!isAsked(field, answers)) return {};
  const value = answers[field.id] ?? "";
  const limit = field.type === "textarea" ? 5000 : 500;
  if (value.length > limit)
    return { error: `That's too long. Please keep it under ${limit} characters.` };
  if (field.type === "radio") {
    const options = field.options ?? [];
    return options.includes(value.trim())
      ? {}
      : { error: `Please choose ${options.join(" or ")}.` };
  }
  if (field.optional && !value.trim()) return {};
  switch (field.id) {
    case "ein":
      return checkEin(value);
    case "fullName":
      return checkFullName(value);
    case "businessName":
      return checkBusinessName(value);
    case "businessContact":
    case "customerPhone":
      return checkPhone(value, field.id);
    case "businessAddress":
      return checkAddress(value);
    case "areaCode":
      return checkAreaCode(value);
    case "timeZone":
      return checkTimeZone(value);
    case "leadEmail":
      return checkEmail(value);
    case "cities":
      return checkCities(value);
    case "website":
      return checkWebsite(value);
    case "domainName":
      return checkDomain(value);
    case "googleProfileLink":
      return checkGoogleLink(value);
    case "yearStarted":
      return checkYear(value);
    default:
      if (!value.trim()) return { error: "Please answer this question." };
      return writtenAnswerWarning(field.id, value);
  }
}
