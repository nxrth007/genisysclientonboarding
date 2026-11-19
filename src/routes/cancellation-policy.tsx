import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Cancellation Policy (Draft) | Lead Genisys Onboarding" },
      {
        name: "description",
        content: "Draft Lead Genisys cancellation policy, pending the owner's legal review.",
      },
    ],
  }),
  component: CancellationPolicyRoute,
});

function CancellationPolicyRoute() {
  return <PolicyPage policyKey="cancellationPolicy" />;
}
