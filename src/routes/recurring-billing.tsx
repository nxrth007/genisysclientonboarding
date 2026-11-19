import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/recurring-billing")({
  head: () => ({
    meta: [
      { title: "Recurring Billing (Draft) | Lead Genisys Onboarding" },
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
