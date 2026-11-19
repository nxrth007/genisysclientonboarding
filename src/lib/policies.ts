/**
 * Policy text for the standalone policy routes. The intake form does not
 * link to these pages and does not collect acceptance.
 *
 * Terms are the plain text of the Terms of Service published on the Lead
 * Genisys signup site (nxrth007/freesysystems, src/pages/TermsOfService.tsx,
 * last updated August 6, 2026). Refund, cancellation, and recurring billing
 * were not separate pages. Those three are drafts assembled only from that
 * document and from the signup checkout's own price lines. They need the
 * owner's legal review before they are treated as final.
 *
 * The price line matches the signup checkout: $0 today, 30-day free trial,
 * then $297/month (freesysystems TrialCheckoutSection and stripe-config.ts,
 * TRIAL_DAYS = 30, TRIAL_PRICE_ID commented "$297/mo"). This file does not
 * add a different price.
 */

/** Signup checkout: "Due today $0.00" and "Then $297/mo after your 30-day trial". */
export const BILLING_SUMMARY = "$0 due today on the 30-day free trial, then $297 per month.";

export const PUBLISHED_TERMS_VERSION = "2026-08-06";
export const DRAFT_POLICY_VERSION = "2026-11-19";

const DRAFT_BANNER =
  "DRAFT — pending legal review by the owner of Lead Genisys. This is not counsel-approved policy text.";

export const TERMS_TEXT = [
  "Lead Genisys LLC Terms of Service",
  "Last updated: August 6, 2026",
  "Version: 2026-08-06",
  "",
  "1. Agreement to Terms",
  'By accessing or using the services provided by Lead Genisys LLC ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use our services.',
  'These Terms constitute a legally binding agreement between you ("Client," "you," or "your") and Lead Genisys LLC. Please read these Terms carefully before using our services.',
  "",
  "2. Description of Services",
  "Lead Genisys LLC provides done-for-you websites, AI-powered follow-up, and 5-star review automation for home service contractors, including but not limited to roofing, solar, HVAC, remodeling, and related trades.",
  "Our services include:",
  "- Custom contractor website design, build, and hosting",
  "- AI-powered speed-to-lead follow-up via text and email",
  "- Appointment scheduling and calendar management",
  "- CRM setup and automation",
  "- Automated 5-star review requests and reputation management",
  "- Missed-call text back and lead nurturing",
  "- Performance tracking and reporting",
  "Our services are designed exclusively for business use. By using our services, you represent that you are using them for commercial purposes related to your business operations.",
  "",
  "3. SMS Messaging Terms & Compliance",
  "Program Description. This messaging program sends appointment confirmation and reminder messages to customers who have filled out a form with Lead Genisys LLC through our website at https://contractors.leadgenisys.com/contact, or via our scheduling forms, and who have explicitly opted in to receive SMS notifications. Opt-in is collected via web forms with a dedicated checkbox for SMS consent. Messages include scheduling confirmations, appointment reminders, rescheduling updates, and customer support communications.",
  "Message types:",
  "- Appointment confirmations and reminders",
  "- Service status updates and notifications",
  "- Performance and review activity updates",
  "- Follow-up communications regarding your inquiry",
  "- Promotional messages about our services (with prior consent)",
  "Message frequency varies based on your service plan and interaction with our platform. You may receive up to 7 messages per month depending on scheduled appointments and service activity.",
  'You can cancel the SMS service at any time. Just text "STOP" to +1 213-510-1418. After you send the SMS message "STOP" to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us. If you want to join again, just sign up as you did the first time and we will start sending SMS messages to you again.',
  "You may also opt out by calling us at +1 213-510-1418 or emailing ethan@leadgenisys.com.",
  'If you experience issues with the messaging program, reply with the keyword "HELP" for more assistance, or reach out directly to ethan@leadgenisys.com or call +1 213-510-1418 during business hours.',
  'If you previously opted out of our SMS messages and would like to rejoin the program, you may opt back in at any time by signing up again through the same method you originally used (such as submitting a form on our website or providing consent during registration). Once you re-enroll, you will begin receiving SMS messages from us as before. If you need assistance rejoining or encounter any issues, reply "HELP" for support or contact us directly at ethan@leadgenisys.com or call +1 213-510-1418 during business hours.',
  "Carriers are not liable for delayed or undelivered messages.",
  "As always, message and data rates may apply for any messages sent to you from us and to us from you. You will receive messages to confirm your appointment and to remind you of the time and date. If you have any questions about your text plan or data plan, it is best to contact your wireless provider.",
  "Our SMS program works with all major U.S. wireless carriers, including AT&T, T-Mobile, Verizon, Sprint, and most regional carriers.",
  "Our SMS messaging program is intended for users who are 18 years of age or older. By opting in to receive text messages, you confirm that you are at least 18 years old.",
  "Consent to receive text messages is not a condition of purchasing any goods or services from Lead Genisys LLC.",
  "If you have any questions regarding privacy, please read the Privacy Policy published with these Terms.",
  "",
  "4. Account Registration",
  "To use our services, you must:",
  "- Provide accurate, current, and complete information about yourself and your business",
  "- Maintain the accuracy of your information and promptly update it as necessary",
  "- Maintain the security and confidentiality of your account credentials",
  "- Notify us immediately of any unauthorized access to your account",
  "You are solely responsible for all activities that occur under your account.",
  "",
  "5. Service Plans and Billing",
  "Our core offer is a monthly subscription that includes a free website build with ongoing AI follow-up and 5-star review automation. Subscription fees are billed monthly in advance and continue until cancelled in accordance with Section 10.",
  "The website is provided at no upfront cost as part of an active subscription. Additional scope, custom work, or add-on services are quoted separately and documented in a service agreement between Lead Genisys LLC and the Client. Late or failed payments may result in suspension of your website, automations, and account access.",
  "",
  "6. Results and Performance",
  "Lead Genisys LLC is committed to delivering measurable results. Any specific performance commitments, including lead or appointment targets and timelines, are defined in the Client's individual service agreement.",
  'Definition of Qualified Appointment. Where appointment delivery is included, a "qualified appointment" is a prospect who:',
  "- Is a homeowner (not a renter)",
  "- Is located within your designated service area",
  "- Has expressed genuine interest in your services",
  "- Has a project timeline within the next 12 months",
  "- Shows up to the scheduled appointment or provides advance notice of rescheduling",
  "To qualify for any performance commitment, Client must respond to contacts in a reasonable timeframe, keep the provided systems active, and maintain calendar availability for scheduled appointments.",
  "",
  "7. Client Responsibilities",
  "As a Client, you agree to:",
  "- Provide the content, photos, licensing, and business details needed to build your website",
  "- Grant the access required to connect your phone number, calendar, CRM, and Google Business Profile",
  "- Respond to leads and contacts in a timely manner",
  "- Provide accurate business information, including service areas and offerings",
  "- Maintain calendar availability for scheduled appointments",
  "- Provide feedback on lead quality and appointment outcomes",
  "- Only request reviews from genuine customers and comply with all review platform policies",
  "- Conduct business in a professional and ethical manner and comply with all applicable laws",
  "",
  "8. Market Exclusivity",
  "Lead Genisys LLC operates on a one-client-per-market basis. Once you secure exclusivity for your market/service area, we will not work with competing businesses in that same market for the same services.",
  "- Exclusivity is maintained as long as you remain an active, paying client",
  "- Market boundaries are defined at the start of the engagement",
  "- Exclusivity does not transfer if you cancel or pause services",
  "- We reserve the right to define market boundaries at our discretion",
  "",
  "9. Intellectual Property",
  "During Active Service. Lead Genisys LLC retains ownership of the website, landing pages, creative assets, CRM workflows, automation sequences, and other materials created as part of the service. Client receives a license to use these materials for the duration of the subscription. Your own content, logos, photos, and customer data remain yours.",
  "Upon Agreement Completion. Ownership or transfer terms for the website and related assets, if applicable, are specified in the individual service agreement. Client is responsible for any ongoing hosting, maintenance, and updates following such a transfer.",
  "",
  "10. Cancellation and Refunds",
  "Cancellation. Either party may cancel services with 30 days written notice. Cancellation requests should be sent to ethan@leadgenisys.com. Upon cancellation, hosting, AI follow-up, and review automation are discontinued at the end of the current billing period.",
  "Refund Policy.",
  "- Setup and creative work are non-refundable once work has commenced",
  "- Fees paid for the current service period are non-refundable",
  "- Unused prepaid services may be credited toward future services at our discretion",
  "",
  "11. Termination",
  "We may terminate or suspend your access to our services immediately, without prior notice, for:",
  "- Breach of these Terms",
  "- Non-payment of fees",
  "- Fraudulent or illegal activity",
  "- Conduct that harms our reputation or other clients",
  "Upon termination, your access to our systems and platforms will be revoked. Any data collected on your behalf remains subject to our Privacy Policy.",
  "",
  "12. Limitation of Liability",
  "To the maximum extent permitted by law:",
  "- Lead Genisys LLC is not responsible for final sales outcomes. Our services generate leads, follow up, and set appointments; closing sales is the Client's responsibility.",
  "- Results depend on the Client's sales process, pricing, reputation, and ability to convert leads.",
  "- We are not liable for changes to third-party platforms (including search engines, review platforms, hosting, or messaging carriers) that may affect performance.",
  "- Our total liability shall not exceed the fees paid by Client in the 3 months preceding any claim.",
  "",
  "13. Disclaimer of Warranties",
  'Our services are provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, or guaranteed revenue or profit results.',
  "While we strive for excellent results, we cannot guarantee specific revenue outcomes as many factors beyond our control affect sales success.",
  "",
  "14. Indemnification",
  "You agree to indemnify, defend, and hold harmless Lead Genisys LLC, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from or related to: your use of our services, your violation of these Terms, your violation of any rights of another party, or any content or information you provide to us.",
  "",
  "15. Dispute Resolution",
  "Governing Law: These Terms shall be governed by and construed in accordance with the laws of the State of Florida, without regard to its conflict of law principles.",
  "Informal Resolution: Before initiating any legal proceeding, you agree to first contact us at ethan@leadgenisys.com to attempt to resolve any dispute informally.",
  "Arbitration: Any dispute arising from these Terms or your use of our services that cannot be resolved informally shall be settled by binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in Florida.",
  "",
  "16. Changes to Terms",
  'We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the "Last Updated" date and, where appropriate, by sending an email notification. Your continued use of our services after such changes constitutes acceptance of the new Terms.',
  "",
  "17. Contact Information",
  "If you have any questions about these Terms of Service, please contact us:",
  "Lead Genisys LLC",
  "2 Dalton Lane, Hampton, NH 03842",
  "Phone: +1 213-510-1418",
  "Email: ethan@leadgenisys.com",
  "Website: https://contractors.leadgenisys.com/contact",
].join("\n");

export const REFUND_POLICY_TEXT = [
  DRAFT_BANNER,
  "Version: 2026-11-19",
  "",
  "This draft repeats the refund terms Lead Genisys already publishes. It does not add a new price.",
  "",
  'Trial. A new signup is a 30-day free trial. $0 is due today. Cancel within 30 days and you pay nothing. That is the line on the Lead Genisys signup checkout ("Cancel within 30 days, pay nothing" and "Due today $0.00").',
  "",
  "After a charge, the Terms of Service last updated August 6, 2026, section 10, state:",
  "- Setup and creative work are non-refundable once work has commenced.",
  "- Fees paid for the current service period are non-refundable.",
  "- Unused prepaid services may be credited toward future services at Lead Genisys LLC's discretion.",
  "",
  "If you are not bringing your own domain, the price of the domain you requested is still charged on your next invoice. This page does not state that domain's price.",
].join("\n");

export const CANCELLATION_POLICY_TEXT = [
  DRAFT_BANNER,
  "Version: 2026-11-19",
  "",
  "This draft repeats the cancellation terms Lead Genisys already publishes. It does not add a new price.",
  "",
  "Trial. Cancel within 30 days of signup and you pay nothing. That is the line on the Lead Genisys signup checkout.",
  "",
  "After the trial, the Terms of Service last updated August 6, 2026, section 10, state: Either party may cancel services with 30 days written notice. Cancellation requests should be sent to ethan@leadgenisys.com. Upon cancellation, hosting, AI follow-up, and review automation are discontinued at the end of the current billing period.",
].join("\n");

export const RECURRING_BILLING_TEXT = [
  DRAFT_BANNER,
  "Version: 2026-11-19",
  "",
  "This draft repeats the billing schedule Lead Genisys already shows at signup. It does not add a new price.",
  "",
  BILLING_SUMMARY,
  "A card is required to start the trial. After the 30-day trial, the card on file is charged $297 per month. Subscription fees are billed monthly in advance and continue until cancelled, which is what section 5 of the Terms of Service (last updated August 6, 2026) states.",
  "",
  "If you are not bringing your own domain, the price of the domain you requested is still charged on your next invoice. This page does not state that domain's price.",
].join("\n");

export const POLICY_KEYS = [
  "terms",
  "refundPolicy",
  "cancellationPolicy",
  "recurringBilling",
] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export type PolicyDocument = {
  key: PolicyKey;
  title: string;
  path: string;
  version: string;
  draft: boolean;
  /** Exact characters shown on the policy page. */
  text: string;
};

export const POLICIES: Record<PolicyKey, PolicyDocument> = {
  terms: {
    key: "terms",
    title: "Terms of Service",
    path: "/terms",
    version: PUBLISHED_TERMS_VERSION,
    draft: false,
    text: TERMS_TEXT,
  },
  refundPolicy: {
    key: "refundPolicy",
    title: "Refund Policy",
    path: "/refund-policy",
    version: DRAFT_POLICY_VERSION,
    draft: true,
    text: REFUND_POLICY_TEXT,
  },
  cancellationPolicy: {
    key: "cancellationPolicy",
    title: "Cancellation Policy",
    path: "/cancellation-policy",
    version: DRAFT_POLICY_VERSION,
    draft: true,
    text: CANCELLATION_POLICY_TEXT,
  },
  recurringBilling: {
    key: "recurringBilling",
    title: "Recurring Billing",
    path: "/recurring-billing",
    version: DRAFT_POLICY_VERSION,
    draft: true,
    text: RECURRING_BILLING_TEXT,
  },
};
