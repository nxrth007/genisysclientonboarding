import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy (Draft) | Lead Genisys Onboarding" },
      { property: "og:title", content: "Refund Policy (Draft) | Lead Genisys Onboarding" },
      { property: "og:description", content: "Draft Lead Genisys refund policy, pending the owner's legal review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
