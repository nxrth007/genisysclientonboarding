import { createFileRoute } from "@tanstack/react-router";

import PolicyPage from "@/components/PolicyPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Lead Genisys Onboarding" },
      {
        name: "description",
        content: "Lead Genisys Terms of Service, last updated August 6, 2026.",
      },
    ],
  }),
  component: TermsRoute,
});

function TermsRoute() {
  return <PolicyPage policyKey="terms" />;
}
