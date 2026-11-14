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
  /** Shown in red under the label as a warning. */
  alert?: string;

  /** Shown in a hover tooltip on the small "i" beside the required star. */
  help?: string;
  /** Can be left blank (shown as "optional" instead of the required star). */
  optional?: boolean;
  /** Starts a new section: a heading (and optional intro) shown above this question. */
  section?: { title: string; intro?: string };
  /** The browser's autofill hint for the box ("name", "organization", "email", "tel"). */
  autoComplete?: string;
  /** Suggests real addresses as they type, and fills in the one they pick (AddressAutocomplete). */
  addressLookup?: boolean;
  /** One US phone number, formatted as they type ("(512) 555-0123"). */
  phone?: boolean;
  /** Which keyboard phones show for the box. */
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  /** A short name for the question, in the list of answers to fix before submitting. */
  short?: string;
};

export const INTAKE_FIELDS: IntakeField[] = [
  {
    id: "ein",
    label: "EIN (Employer Identification Number) — needed to send text messages to potential clients",
    short: "EIN",
    type: "text",
    placeholder: "XX-XXXXXXX",
    help: "We use your EIN to register your business for A2P 10DLC text messaging compliance. Wireless carriers require a verified business identity before marketing texts can be delivered — without this registration, messages to potential clients get filtered or blocked.",
  },
  {
    id: "fullName",
    label: "Full Name",
    short: "Full Name",
    type: "text",
    autoComplete: "name",
    placeholder: "e.g. Maria Lopez",
    note: "One person: the owner or main contact, first and last name.",
  },
  {
    id: "businessName",
    label: "Legal Business Name",
    short: "Legal Business Name",
    type: "text",
    autoComplete: "organization",
    note: "Please note: this must be the legally registered business name exactly as it appears on your IRS CP-575 (EIN confirmation letter). Just the name: your address goes in Business Address below.",
    alert: "Please check your CP-575 or any IRS document to verify your full legal business name",
  },

  {
    id: "businessContact",
    label: "Business Contact Information",
    short: "Business Contact Information",
    type: "text",
    phone: true,
    autoComplete: "tel",
    placeholder: "(512) 555-0123",
    note: "The best number to reach you (the owner or main contact) directly, usually your cell. One number only.",
  },
  {
    id: "businessAddress",
    label: "Business Address",
    short: "Business Address",
    type: "text",
    addressLookup: true,
    placeholder: "e.g. 123 Main St, Austin, TX 78701",
    note: "Start typing, then pick your address from the list: the street address where the business is based (street, city, state and ZIP), not a PO box.",
  },
  {
    id: "customerPhone",
    label:
      "What is the best phone number for customers to reach you? (We will be setting up a tracking number that forwards here)",
    short: "Customer phone number",
    type: "text",
    phone: true,
    autoComplete: "tel",
    placeholder: "(512) 555-0123",
    note: "One number only. Have a second number? Put it in Business Contact Information above.",
  },
  {
    id: "areaCode",
    label: "Area code on the number we purchase - call tracking",
    short: "Area code",
    type: "text",
    inputMode: "numeric",
    placeholder: "e.g. 512",
    note: "3 digits. Not sure? Use the one from your business phone number.",
  },
  {
    id: "timeZone",
    label: "Your Time Zone",
    short: "Time Zone",
    type: "text",
    placeholder: "e.g. Central",
    note: "Eastern, Central, Mountain, Pacific, Alaska or Hawaii.",
  },
  {
    id: "leadEmail",
    label: "What is your best email for our lead communication?",
    short: "Email",
    type: "email",
    autoComplete: "email",
    inputMode: "email",
    placeholder: "you@yourbusiness.com",
  },
  {
    id: "cities",
    label: "What cities do you service?",
    short: "Cities you service",
    type: "text",
    placeholder: "e.g. Austin TX, Round Rock TX, Georgetown TX",
    note: "Each city with its state, separated by commas.",
  },
  {
    id: "website",
    label: "What is your current website link? If none, put N/A",
    short: "Website",
    type: "text",
    inputMode: "url",
    placeholder: "https://yourbusiness.com",
  },
  {
    id: "aboutBusiness",
    label: "About The Business",
    short: "About The Business",
    type: "textarea",
    placeholder: "A few sentences: what you do, who you serve and how long you've been doing it.",
  },
  {
    id: "mainServices",
    label: "What are the main services you want to promote?",
    short: "Main services",
    type: "textarea",
    placeholder: "e.g. Roof repair, roof replacement, gutter installation",
  },
  {
    id: "promotions",
    label: "Current promotions/offers",
    short: "Promotions/offers",
    type: "textarea",
    placeholder: "e.g. 10% off your first job, free estimates. No offers right now? Write None.",
  },
  {
    id: "socialLinks",
    label: "Social media pages (Facebook, Instagram, etc.) — paste the full links",
    short: "Social media pages",
    type: "textarea",
    note: "The full link to your page, e.g. facebook.com/yourbusiness. If you don't have any, put N/A.",
  },
  {
    id: "whyChooseYou",
    label: "Why customers should choose you",
    short: "Why customers should choose you",
    type: "textarea",
    placeholder: "e.g. Family-owned, 15 years' experience, licensed and insured",
  },
  {
    id: "brandColors",
    label: "Brand colors/style preferences",
    short: "Brand colors/style",
    type: "textarea",
    placeholder: "e.g. Navy blue and white, clean and modern",
  },
  {
    id: "faqs",
    label: "FAQs + answers",
    short: "FAQs + answers",
    type: "textarea",
    placeholder: "e.g. Do you offer free estimates? Yes, always.",
  },
  {
    id: "bringingOwnDomain",
    label: "Do you plan on bringing your own domain?",
    short: "Bringing your own domain",
    type: "radio",
    options: ["Yes", "No"],
    afterFiles: true,
  },
  {
    id: "domainName",
    label: "What is your domain?",
    short: "Your domain",
    type: "text",
    inputMode: "url",
    placeholder: "yourbusiness.com",
    afterFiles: true,
    requiredWhen: { field: "bringingOwnDomain", equals: "Yes" },
  },
  // Added at the end so the Google Sheet's existing columns keep their place.
  {
    id: "hasGoogleProfile",
    label: "Do you have a Google Business Profile? (your business listing on Google Maps)",
    short: "Google Business Profile",
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
    short: "Google Business Profile link",
    type: "text",
    inputMode: "url",
    placeholder: "https://maps.app.goo.gl/…",
    note: "Open Google Maps, search your business name, tap Share, then Copy link — and paste it here.",
    afterFiles: true,
    requiredWhen: { field: "hasGoogleProfile", equals: "Yes" },
  },
  {
    id: "yearStarted",
    label: "What year did your business start?",
    short: "Year started",
    type: "text",
    inputMode: "numeric",
    placeholder: "2012",
    afterFiles: true,
    optional: true,
  },
  {
    id: "licenseInfo",
    label: "Contractor license number(s) and who issued them",
    short: "Contractor license",
    type: "text",
    placeholder: "e.g. #0081234 — State Contractors Board",
    note: "Leave blank if your trade doesn't require a license.",
    afterFiles: true,
    optional: true,
  },
  {
    id: "reviewLinks",
    label: "Review sites you're listed on — paste the full links",
    short: "Review sites",
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
