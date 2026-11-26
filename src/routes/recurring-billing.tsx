import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/recurring-billing")({
  head: () => ({
    meta: [
      { title: "Recurring Billing (Draft) | Lead Genisys Onboarding" },
      { property: "og:title", content: "Recurring Billing (Draft) | Lead Genisys Onboarding" },
      { property: "og:description", content: "Draft Lead Genisys recurring billing disclosure, pending the owner's legal review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "Draft Lead Genisys recurring billing disclosure, pending the owner's legal review.",
      },
    ],
  }),
  component: RecurringBillingRoute,
});

function RecurringBillingRoute() {
  return <PolicyPage policyKey="recurringBilling" />;
}
