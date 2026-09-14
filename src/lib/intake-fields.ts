export type IntakeField = {
  id: string;
  label: string;
  type: "text" | "email" | "textarea";
  placeholder?: string;
};

export const INTAKE_FIELDS: IntakeField[] = [
  {
    id: "ein",
    label: "EIN (Employer Identification Number) — needed to send text messages to potential clients",
    type: "text",
    placeholder: "XX-XXXXXXX",
  },
  { id: "fullName", label: "Full Name", type: "text" },
  { id: "businessName", label: "Business Name", type: "text" },
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
  { id: "socialLinks", label: "Social media/online profile links", type: "textarea" },
  { id: "whyChooseYou", label: "Why customers should choose you", type: "textarea" },
  { id: "brandColors", label: "Brand colors/style preferences", type: "textarea" },
  { id: "faqs", label: "FAQs + answers", type: "textarea" },
];

export const FILE_FIELD_LABEL =
  "Marketing Content (Logo, Before and After Photos, All Service Photos, etc)";

export const SHEET_HEADERS = [
  "Timestamp",
  ...INTAKE_FIELDS.map((f) => f.label),
  FILE_FIELD_LABEL,
];