export type IntakeField = {
  id: string;
  label: string;
  type: "text" | "email" | "textarea" | "radio";
  placeholder?: string;
  options?: string[];
  /** Rendered (and stored) after the marketing content upload field. */
  afterFiles?: boolean;
  /** Only required (and shown) when this radio answer equals `equals`. */
  requiredWhen?: { field: string; equals: string };
  /** Optional helper note shown under the label. */
  note?: string;
  /** Shown in a hover tooltip on the small "i" beside the required star. */
  help?: string;
  /** Can be left blank (shown as "optional" instead of the required star). */
  optional?: boolean;
  /** Starts a new section: a heading (and optional intro) shown above this question. */
  section?: { title: string; intro?: string };
};

export const INTAKE_FIELDS: IntakeField[] = [
  {
    id: "ein",
    label: "EIN (Employer Identification Number) — needed to send text messages to potential clients",
    type: "text",
    placeholder: "XX-XXXXXXX",
    help: "We use your EIN to register your business for A2P 10DLC text messaging compliance. Wireless carriers require a verified business identity before marketing texts can be delivered — without this registration, messages to potential clients get filtered or blocked.",
  },
  { id: "fullName", label: "Full Name", type: "text" },
  {
    id: "businessName",
    label: "Legal Business Name",
    type: "text",
    note: "Please note: this must be the legally registered business name exactly as it appears on your IRS CP-575 (EIN confirmation letter).",
  },
  { id: "businessContact", label: "Business Contact Information", type: "text" },
  { id: "businessAddress", label: "Business Address", type: "text" },
  {
    id: "customerPhone",
    label:
      "What is the best phone number for customers to reach you? (We will be setting up a tracking number that forwards here)",
    type: "text",
  },
  {
    id: "areaCode",
    label: "Area code on the number we purchase - call tracking",
    type: "text",
  },
  { id: "timeZone", label: "Your Time Zone", type: "text" },
  {
    id: "leadEmail",
    label: "What is your best email for our lead communication?",
    type: "email",
  },
  { id: "cities", label: "What cities do you service?", type: "text" },
  {
    id: "website",
    label: "What is your current website link? If none, put N/A",
    type: "text",
  },
  { id: "aboutBusiness", label: "About The Business", type: "textarea" },
  {
    id: "mainServices",
    label: "What are the main services you want to promote?",
    type: "textarea",
  },
  { id: "promotions", label: "Current promotions/offers", type: "textarea" },
  {
    id: "socialLinks",
    label: "Social media pages (Facebook, Instagram, etc.) — paste the full links",
    type: "textarea",
    note: "The full link to your page, e.g. facebook.com/yourbusiness. If you don't have any, put N/A.",
  },
  { id: "whyChooseYou", label: "Why customers should choose you", type: "textarea" },
  { id: "brandColors", label: "Brand colors/style preferences", type: "textarea" },
  { id: "faqs", label: "FAQs + answers", type: "textarea" },
  {
    id: "bringingOwnDomain",
    label: "Do you plan on bringing your own domain?",
    type: "radio",
    options: ["Yes", "No"],
    afterFiles: true,
  },
  {
    id: "domainName",
    label: "What is your domain?",
    type: "text",
    placeholder: "yourbusiness.com",
    afterFiles: true,
    requiredWhen: { field: "bringingOwnDomain", equals: "Yes" },
  },
  // Added at the end so the Google Sheet's existing columns keep their place.
  {
    id: "hasGoogleProfile",
    label: "Do you have a Google Business Profile? (your business listing on Google Maps)",
    type: "radio",
    options: ["Yes", "No"],
    afterFiles: true,
    section: {
      title: "Help us get you found on Google",
      intro: "A few quick details that help your business show up on Google and in AI answers like ChatGPT.",
    },
  },
  {
    id: "googleProfileLink",
    label: "Link to your Google Business Profile",
    type: "text",
    placeholder: "https://maps.app.goo.gl/…",
    note: "Open Google Maps, search your business name, tap Share, then Copy link — and paste it here.",
    afterFiles: true,
    requiredWhen: { field: "hasGoogleProfile", equals: "Yes" },
  },
  {
    id: "yearStarted",
    label: "What year did your business start?",
    type: "text",
    placeholder: "2012",
    afterFiles: true,
    optional: true,
  },
  {
    id: "licenseInfo",
    label: "Contractor license number(s) and who issued them",
    type: "text",
    placeholder: "e.g. #0081234 — State Contractors Board",
    note: "Leave blank if your trade doesn't require a license.",
    afterFiles: true,
    optional: true,
  },
  {
    id: "reviewLinks",
    label: "Review sites you're listed on — paste the full links",
    type: "textarea",
    note: "Yelp, Angi / HomeAdvisor, BBB, Thumbtack, Houzz, Nextdoor — the link to your page on each one you have.",
    afterFiles: true,
    optional: true,
  },
];

export const FILE_FIELD_LABEL =
  "Marketing Content (Logo, Before and After Photos, All Service Photos, etc)";

export const FIELDS_BEFORE_FILES = INTAKE_FIELDS.filter((f) => !f.afterFiles);
export const FIELDS_AFTER_FILES = INTAKE_FIELDS.filter((f) => f.afterFiles);

/** Column order in the sheet must match the on-screen order of the questions. */
export const SHEET_COLUMN_FIELDS: IntakeField[] = [...FIELDS_BEFORE_FILES, ...FIELDS_AFTER_FILES];

export const SHEET_HEADERS = [
  "Timestamp",
  ...FIELDS_BEFORE_FILES.map((f) => f.label),
  FILE_FIELD_LABEL,
  ...FIELDS_AFTER_FILES.map((f) => f.label),
];

export const DNS_ACCESS_EMAIL = "alex@leadgenisys.com";
