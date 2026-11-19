import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy (Draft) | Lead Genisys Onboarding" },
      {
        name: "description",
        content: "Draft Lead Genisys refund policy, pending the owner's legal review.",
      },
    ],
  }),
  component: RefundPolicyRoute,
});

function RefundPolicyRoute() {
  return <PolicyPage policyKey="refundPolicy" />;
}
